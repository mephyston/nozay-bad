import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushSubscriptionsTable } from '../shared/schema';
import { subscribeToPush } from './handler';
import { unsubscribeFromPush } from '../unsubscribe/handler';

const SUBSCRIPTION = {
  endpoint: 'https://web.push.apple.com/device-a',
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

describe('subscribeToPush', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it("enregistre l'abonnement en normalisant l'email", async () => {
    await subscribeToPush(db, { ...SUBSCRIPTION, email: '  Jean.Dupont@Example.COM ' });

    const rows = await db.select().from(pushSubscriptionsTable).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('jean.dupont@example.com');
  });

  it('ne duplique pas un endpoint déjà connu et le réaffecte au compte connecté', async () => {
    await subscribeToPush(db, { ...SUBSCRIPTION, email: 'parent1@example.com' });
    await subscribeToPush(db, { ...SUBSCRIPTION, email: 'parent2@example.com', userAgent: 'iPhone' });

    const rows = await db.select().from(pushSubscriptionsTable).all();
    expect(rows).toHaveLength(1);
    // Appareil partagé : les notifications suivent le dernier compte connecté.
    expect(rows[0].email).toBe('parent2@example.com');
    expect(rows[0].userAgent).toBe('iPhone');
  });

  it('refuse un abonnement sans compte', async () => {
    await expect(subscribeToPush(db, { ...SUBSCRIPTION, email: '   ' })).rejects.toThrow();
  });
});

describe('unsubscribeFromPush', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await subscribeToPush(db, { ...SUBSCRIPTION, email: 'jean@example.com' });
  });

  it("supprime l'abonnement de son propre compte", async () => {
    const result = await unsubscribeFromPush(db, {
      email: 'Jean@example.com',
      endpoint: SUBSCRIPTION.endpoint
    });

    expect(result.removed).toBe(1);
    expect(await db.select().from(pushSubscriptionsTable).all()).toHaveLength(0);
  });

  it("ne supprime pas l'abonnement d'un autre compte", async () => {
    const result = await unsubscribeFromPush(db, {
      email: 'intrus@example.com',
      endpoint: SUBSCRIPTION.endpoint
    });

    expect(result.removed).toBe(0);
    expect(await db.select().from(pushSubscriptionsTable).all()).toHaveLength(1);
  });
});
