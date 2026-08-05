import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { membersTable } from '@nba/members/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { setupMockDb } from '@nba/db/test-utils';
import { notificationsRouter } from '@nba/notifications-api';
import {
  pushDeliveriesTable,
  pushMessagesTable
} from '../../../libs/domains/notifications/shared/schema';
import { notificationsSendRouter } from './notifications';

const app = new Hono<{ Bindings: { DB: any } }>();
app.route('/notifications', notificationsRouter);
app.route('/notifications', notificationsSendRouter);

const KEYS = {
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

async function subscribe(mockD1: any, email: string, endpoint: string) {
  const res = await app.request(
    '/notifications/subscriptions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, endpoint, keys: KEYS })
    },
    { DB: mockD1 }
  );
  expect(res.status).toBe(200);
}

async function seed(db: any) {
  await db
    .insert(seasonsTable)
    .values({
      id: 1,
      code: '25-26',
      name: 'Saison 25-26',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    })
    .run();

  const base = {
    seasonId: 1,
    lastName: 'Dupont',
    gender: 'M' as const,
    birthDate: '2010-01-01',
    status: 'valide' as const,
    type: 'Jeune',
    importedAt: new Date()
  };
  await db
    .insert(membersTable)
    .values([
      { ...base, id: 1, licence: 'L1', firstName: 'Alice', email: 'paye@example.com', paid: true },
      // Mineur : pas d'email au dossier, c'est le parent qui détient le compte.
      { ...base, id: 2, licence: 'L2', firstName: 'Bob', email: null, parent1Email: 'parent@example.com', paid: false }
    ])
    .run();
}

describe('POST /notifications/messages', () => {
  it('diffuse à tous les appareils abonnés', async () => {
    const { mockD1, db } = await setupMockDb();
    await seed(db);
    await subscribe(mockD1, 'paye@example.com', 'https://push.example.com/a');
    await subscribe(mockD1, 'parent@example.com', 'https://push.example.com/b');

    const res = await app.request(
      '/notifications/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Tournoi', body: 'Samedi', target: 'all' })
      },
      { DB: mockD1 }
    );

    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data.queued).toBe(2);
  });

  it("ne cible que les foyers dont la cotisation n'est pas soldée, parents compris", async () => {
    const { mockD1, db } = await setupMockDb();
    await seed(db);
    await subscribe(mockD1, 'paye@example.com', 'https://push.example.com/a');
    await subscribe(mockD1, 'parent@example.com', 'https://push.example.com/b');

    const res = await app.request(
      '/notifications/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Cotisation', body: 'À régler', target: 'unpaid' })
      },
      { DB: mockD1 }
    );

    expect(((await res.json()) as any).data.queued).toBe(1);
    const [delivery] = await db.select().from(pushDeliveriesTable).all();
    expect(delivery).toBeDefined();
    // L'historique garde l'intention de ciblage.
    const [message] = await db.select().from(pushMessagesTable).all();
    expect(message.target).toBe('unpaid');
  });

  it('refuse une URL absolue : une notification ne doit pas ouvrir un site tiers', async () => {
    const { mockD1 } = await setupMockDb();

    const res = await app.request(
      '/notifications/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Promo',
          body: 'Cliquez',
          url: 'https://exemple-malveillant.test',
          target: 'all'
        })
      },
      { DB: mockD1 }
    );

    expect(res.status).toBe(400);
  });

  it('refuse un titre vide', async () => {
    const { mockD1 } = await setupMockDb();

    const res = await app.request(
      '/notifications/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', body: 'x', target: 'all' })
      },
      { DB: mockD1 }
    );

    expect(res.status).toBe(400);
  });
});

describe('POST /notifications/dispatch', () => {
  it('échoue explicitement si les clés VAPID ne sont pas configurées', async () => {
    const { mockD1 } = await setupMockDb();

    const res = await app.request('/notifications/dispatch', { method: 'POST' }, { DB: mockD1 });

    expect(res.status).toBe(500);
    expect(((await res.json()) as any).error).toMatch(/VAPID/);
  });
});

describe('GET /notifications/overview', () => {
  it("expose le nombre d'appareils et de comptes couverts", async () => {
    const { mockD1 } = await setupMockDb();
    await subscribe(mockD1, 'a@example.com', 'https://push.example.com/a');
    await subscribe(mockD1, 'a@example.com', 'https://push.example.com/a-tablette');
    await subscribe(mockD1, 'b@example.com', 'https://push.example.com/b');

    const res = await app.request('/notifications/overview', {}, { DB: mockD1 });

    const json = (await res.json()) as any;
    expect(json.data.stats).toMatchObject({ devices: 3, accounts: 2, pending: 0 });
  });
});
