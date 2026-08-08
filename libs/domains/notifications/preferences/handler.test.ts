import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushDeliveriesTable } from '../shared/schema';
import { subscribeToPush } from '../subscribe/handler';
import { enqueueNotification } from '../enqueue/handler';
import { getPreferences, updatePreferences } from './handler';

const KEYS = {
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

describe('préférences de notification', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await subscribeToPush(db, { email: 'a@example.com', endpoint: 'https://push.test/a', ...KEYS });
    await subscribeToPush(db, { email: 'b@example.com', endpoint: 'https://push.test/b', ...KEYS });
  });

  it('active toutes les catégories tant que rien n\'a été réglé', async () => {
    const prefs = await getPreferences(db, 'a@example.com');

    expect(prefs).toHaveLength(5);
    expect(prefs.every((p) => p.enabled)).toBe(true);
    expect(prefs.map((p) => p.id)).toEqual([
      'announcement',
      'birthday',
      'expense',
      'order',
      'reminder'
    ]);
  });

  it('écarte des envois le compte qui a coupé la catégorie', async () => {
    await updatePreferences(db, { email: 'a@example.com', disabled: ['birthday'] });

    const birthday = await enqueueNotification(db, {
      title: 'Anniversaire',
      body: 'Bon anniversaire !',
      target: { kind: 'all' },
      category: 'birthday'
    });
    expect(birthday.queued).toBe(1);

    // Les autres catégories restent servies pour ce même compte.
    const announcement = await enqueueNotification(db, {
      title: 'Tournoi',
      body: 'Samedi',
      target: { kind: 'all' },
      category: 'announcement'
    });
    expect(announcement.queued).toBe(2);
  });

  it('respecte les préférences aussi sur un ciblage par emails', async () => {
    await updatePreferences(db, { email: 'a@example.com', disabled: ['reminder'] });

    const result = await enqueueNotification(db, {
      title: 'Cotisation',
      body: 'À régler',
      target: { kind: 'emails', emails: ['a@example.com', 'b@example.com'] },
      category: 'reminder'
    });

    expect(result.queued).toBe(1);
    expect(await db.select().from(pushDeliveriesTable).all()).toHaveLength(1);
  });

  it('réactive une catégorie retirée de la liste des coupées', async () => {
    await updatePreferences(db, { email: 'a@example.com', disabled: ['birthday', 'reminder'] });
    await updatePreferences(db, { email: 'a@example.com', disabled: ['birthday'] });

    const prefs = await getPreferences(db, 'a@example.com');
    expect(prefs.find((p) => p.id === 'reminder')?.enabled).toBe(true);
    expect(prefs.find((p) => p.id === 'birthday')?.enabled).toBe(false);
  });

  it('ignore une catégorie inconnue au lieu de la stocker', async () => {
    await updatePreferences(db, { email: 'a@example.com', disabled: ['inexistante'] });

    const prefs = await getPreferences(db, 'a@example.com');
    expect(prefs.every((p) => p.enabled)).toBe(true);
    expect(prefs.some((p) => (p.id as string) === 'inexistante')).toBe(false);
  });

  it('normalise la casse de l\'email', async () => {
    await updatePreferences(db, { email: '  A@Example.COM ', disabled: ['order'] });

    const prefs = await getPreferences(db, 'a@example.com');
    expect(prefs.find((p) => p.id === 'order')?.enabled).toBe(false);
  });
});
