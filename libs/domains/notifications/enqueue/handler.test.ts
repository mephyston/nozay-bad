import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushDeliveriesTable, pushMessagesTable } from '../shared/schema';
import { subscribeToPush } from '../subscribe/handler';
import { enqueueNotification, notifyContacts } from './handler';

const KEYS = {
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

async function subscribe(db: Db, email: string, endpoint: string) {
  await subscribeToPush(db, { email, endpoint, ...KEYS });
}

describe('enqueueNotification', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('met en file un envoi par appareil pour la cible « tous »', async () => {
    await subscribe(db, 'a@example.com', 'https://push.example.com/a');
    await subscribe(db, 'a@example.com', 'https://push.example.com/a-tablette');
    await subscribe(db, 'b@example.com', 'https://push.example.com/b');

    const result = await enqueueNotification(db, {
      title: 'Tournoi',
      body: 'Inscriptions ouvertes',
      target: { kind: 'all' }
    });

    expect(result.queued).toBe(3);
    expect(await db.select().from(pushDeliveriesTable).all()).toHaveLength(3);
  });

  it('ne cible que les appareils des emails fournis, en normalisant la casse', async () => {
    await subscribe(db, 'paye@example.com', 'https://push.example.com/paye');
    await subscribe(db, 'parent@example.com', 'https://push.example.com/parent');

    const result = await enqueueNotification(db, {
      title: 'Cotisation',
      body: 'Pensez à régler',
      target: { kind: 'emails', emails: ['  Parent@Example.com ', 'inconnu@example.com'] },
      targetLabel: 'unpaid'
    });

    expect(result.queued).toBe(1);
    const [message] = await db.select().from(pushMessagesTable).all();
    // L'historique conserve l'intention de ciblage, pas sa résolution en emails.
    expect(message.target).toBe('unpaid');
  });

  it('enregistre le message même sans destinataire abonné', async () => {
    const result = await enqueueNotification(db, {
      title: 'Annonce',
      body: 'Personne abonné',
      target: { kind: 'all' }
    });

    expect(result.queued).toBe(0);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(1);
  });

  it('ignore un rappel déjà envoyé dans la fenêtre anti-doublon', async () => {
    await subscribe(db, 'a@example.com', 'https://push.example.com/a');
    const now = new Date('2026-08-05T08:00:00Z');

    const first = await enqueueNotification(
      db,
      { title: 'Rappel', body: 'Cotisation', target: { kind: 'all' }, source: 'reminder:unpaid' },
      now
    );
    const second = await enqueueNotification(
      db,
      {
        title: 'Rappel',
        body: 'Cotisation',
        target: { kind: 'all' },
        source: 'reminder:unpaid',
        skipIfSentSince: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      },
      new Date(now.getTime() + 60_000)
    );

    expect(first.queued).toBe(1);
    expect(second.skipped).toBe(true);
    expect(second.queued).toBe(0);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(1);
  });
});

describe('notifyContacts', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it("notifie tous les contacts d'un adhérent (lui et ses représentants légaux)", async () => {
    await subscribe(db, 'jeune@example.com', 'https://push.example.com/jeune');
    await subscribe(db, 'parent@example.com', 'https://push.example.com/parent');
    await subscribe(db, 'tiers@example.com', 'https://push.example.com/tiers');

    await notifyContacts(db, ['jeune@example.com', 'parent@example.com'], {
      title: 'Note de frais validée',
      body: '12,00 €',
      source: 'expense:approved',
      category: 'expense'
    });

    expect(await db.select().from(pushDeliveriesTable).all()).toHaveLength(2);
  });

  it('ne fait rien sans contact connu', async () => {
    await expect(
      notifyContacts(db, [], {
        title: 'x',
        body: 'y',
        source: 'expense:approved',
        category: 'expense'
      })
    ).resolves.toBeUndefined();
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(0);
  });
});
