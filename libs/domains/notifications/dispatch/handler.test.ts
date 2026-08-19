import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { generateVapidKeys, type VapidKeys } from '@nba/push';
import { pushDeliveriesTable, pushSubscriptionsTable } from '../shared/schema';
import { subscribeToPush } from '../subscribe/handler';
import { enqueueNotification } from '../enqueue/handler';
import { dispatchPendingNotifications, purgeNotificationHistory } from './handler';

const KEYS = {
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

describe('dispatchPendingNotifications', () => {
  let db: Db;
  let vapid: VapidKeys;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    vapid = { subject: 'mailto:contact@nozaybad.fr', ...(await generateVapidKeys()) };
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function queueFor(endpoints: string[]) {
    for (const [index, endpoint] of endpoints.entries()) {
      await subscribeToPush(db, { email: `m${index}@example.com`, endpoint, ...KEYS });
    }
    await enqueueNotification(db, { title: 'Tournoi', body: 'Samedi', target: { kind: 'all' } });
  }

  it('envoie chaque notification en attente et marque la livraison', async () => {
    await queueFor(['https://push.example.com/a', 'https://push.example.com/b']);
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    const result = await dispatchPendingNotifications(db, vapid);

    expect(result).toMatchObject({ sent: 2, failed: 0, pruned: 0, remaining: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Le corps part chiffré en aes128gcm, avec l'en-tête VAPID.
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Encoding']).toBe('aes128gcm');
    expect(init.headers.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    expect(init.body.byteLength).toBeGreaterThan(86);

    const deliveries = await db.select().from(pushDeliveriesTable).all();
    expect(deliveries.every((d) => d.status === 'sent')).toBe(true);
  });

  it("supprime l'abonnement révoqué par le service de push (410)", async () => {
    await queueFor(['https://push.example.com/revoque']);
    fetchMock.mockResolvedValue(new Response('gone', { status: 410 }));

    const result = await dispatchPendingNotifications(db, vapid);

    expect(result.pruned).toBe(1);
    expect(await db.select().from(pushSubscriptionsTable).all()).toHaveLength(0);
    // La livraison est soldée : elle ne doit pas être réessayée indéfiniment.
    expect(result.remaining).toBe(0);
  });

  it('laisse une erreur temporaire en file pour un nouvel essai', async () => {
    await queueFor(['https://push.example.com/lent']);
    fetchMock.mockResolvedValue(new Response('busy', { status: 503 }));

    const result = await dispatchPendingNotifications(db, vapid);

    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    const [delivery] = await db.select().from(pushDeliveriesTable).all();
    expect(delivery.status).toBe('pending');
    expect(delivery.attempts).toBe(1);
    // L'abonnement reste : un 503 est passager.
    expect(await db.select().from(pushSubscriptionsTable).all()).toHaveLength(1);
  });

  it('abandonne après trois tentatives infructueuses', async () => {
    await queueFor(['https://push.example.com/mort']);
    fetchMock.mockResolvedValue(new Response('busy', { status: 500 }));

    await dispatchPendingNotifications(db, vapid);
    await dispatchPendingNotifications(db, vapid);
    const third = await dispatchPendingNotifications(db, vapid);

    expect(third.remaining).toBe(0);
    const [delivery] = await db.select().from(pushDeliveriesTable).all();
    expect(delivery.status).toBe('failed');
    expect(delivery.attempts).toBe(3);
  });

  it('borne chaque lot pour rester sous le plafond de sous-requêtes du Worker', async () => {
    await queueFor(Array.from({ length: 45 }, (_, i) => `https://push.example.com/${i}`));
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    const result = await dispatchPendingNotifications(db, vapid);

    expect(result.sent).toBe(40);
    expect(result.remaining).toBe(5);
  });

  it("solde les livraisons dont l'abonnement a disparu", async () => {
    await queueFor(['https://push.example.com/a']);
    await db.delete(pushSubscriptionsTable).run();
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    const result = await dispatchPendingNotifications(db, vapid);

    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('purgeNotificationHistory', () => {
  it("supprime les messages au-delà de la rétention et leurs livraisons", async () => {
    const { db } = await setupMockDb();
    await subscribeToPush(db, { email: 'a@example.com', endpoint: 'https://push.example.com/a', ...KEYS });

    const old = new Date('2026-01-01T00:00:00Z');
    await enqueueNotification(db, { title: 'Vieux', body: '…', target: { kind: 'all' } }, old);
    await enqueueNotification(db, { title: 'Récent', body: '…', target: { kind: 'all' } }, new Date('2026-08-05T00:00:00Z'));

    const purged = await purgeNotificationHistory(db, 90, new Date('2026-08-05T00:00:00Z'));

    expect(purged).toBe(1);
    expect(await db.select().from(pushDeliveriesTable).all()).toHaveLength(1);
  });
});
