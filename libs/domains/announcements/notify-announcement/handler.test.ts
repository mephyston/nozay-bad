import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createAnnouncement } from '../create-announcement/handler';
import { notifyAnnouncement } from './handler';

describe('notifyAnnouncement', () => {
  let db: Db;
  let mockD1: D1Database;

  beforeEach(async () => {
    ({ db, mockD1 } = await setupMockDb());
  });

  /**
   * Abonnement inséré en SQL : le domaine annonces ne connaît pas les tranches internes
   * de notifications, et n'a pas à les connaître pour ce test.
   */
  async function subscribe(email: string, endpoint: string) {
    await mockD1
      .prepare(
        `INSERT INTO push_subscriptions (email, endpoint, p256dh, auth, created_at)
         VALUES (?, ?, 'p256dh-test', 'auth-test', ?)`
      )
      .bind(email, endpoint, Math.floor(Date.now() / 1000))
      .run();
  }

  function publish(title = 'Tournoi interne', bodyHtml = '<p>Rendez-vous <strong>samedi</strong>.</p>') {
    return createAnnouncement(db, { title, bodyHtml, status: 'published' }, 'bureau@nozaybad.fr');
  }

  it('met en file un envoi par appareil abonné', async () => {
    await subscribe('a@example.com', 'https://push.example.com/a');
    await subscribe('b@example.com', 'https://push.example.com/b');
    const announcement = await publish();

    const result = await notifyAnnouncement(db, announcement.id);

    expect(result.queued).toBe(2);
  });

  it('enregistre le message avec le titre et le texte brut de l\'annonce', async () => {
    await subscribe('a@example.com', 'https://push.example.com/a');
    const announcement = await publish();

    await notifyAnnouncement(db, announcement.id);

    const message = (await mockD1
      .prepare('SELECT title, body, url, target, category, source FROM push_messages')
      .first()) as Record<string, string>;

    expect(message.title).toBe('Tournoi interne');
    // Le corps part en texte : une notification n'affiche pas de balisage.
    expect(message.body).toBe('Rendez-vous samedi.');
    expect(message.url).toBe('/annonces');
    expect(message.target).toBe('all');
    expect(message.category).toBe('announcement');
    expect(message.source).toBe('announcement:published');
  });

  it('horodate la diffusion', async () => {
    const announcement = await publish();
    const now = new Date('2026-08-08T10:00:00Z');

    const result = await notifyAnnouncement(db, announcement.id, now);

    expect(result.notifiedAt).toEqual(now);
  });

  it('refuse de diffuser deux fois la même annonce', async () => {
    const announcement = await publish();
    await notifyAnnouncement(db, announcement.id);

    await expect(notifyAnnouncement(db, announcement.id)).rejects.toThrow(/déjà été diffusée/i);
  });

  it('refuse de diffuser un brouillon', async () => {
    const draft = await createAnnouncement(
      db,
      { title: 'Brouillon', bodyHtml: '<p>Texte</p>' },
      'bureau@nozaybad.fr'
    );

    await expect(notifyAnnouncement(db, draft.id)).rejects.toThrow(/brouillon/i);
  });

  it('refuse une annonce inexistante', async () => {
    await expect(notifyAnnouncement(db, 9999)).rejects.toThrow(/introuvable/i);
  });

  it('accepte une diffusion sans aucun abonné', async () => {
    const announcement = await publish();

    const result = await notifyAnnouncement(db, announcement.id);

    // Personne d'abonné n'est pas une erreur : l'annonce reste marquée comme diffusée.
    expect(result.queued).toBe(0);
    expect(result.notifiedAt).toBeInstanceOf(Date);
  });
});
