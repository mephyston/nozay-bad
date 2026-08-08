import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createAnnouncement } from './handler';

describe('createAnnouncement', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('crée un brouillon par défaut, sans date de publication', async () => {
    const created = await createAnnouncement(
      db,
      { title: 'Tournoi interne', bodyHtml: '<p>Samedi 12</p>' },
      'bureau@nozaybad.fr'
    );

    expect(created.status).toBe('draft');
    expect(created.publishedAt).toBeNull();
    expect(created.notifiedAt).toBeNull();
    expect(created.authorEmail).toBe('bureau@nozaybad.fr');
  });

  it('date la publication quand l\'annonce est publiée d\'emblée', async () => {
    const now = new Date('2026-08-08T10:00:00Z');
    const created = await createAnnouncement(
      db,
      { title: 'Tournoi interne', bodyHtml: '<p>Samedi 12</p>', status: 'published' },
      'bureau@nozaybad.fr',
      now
    );

    expect(created.status).toBe('published');
    expect(created.publishedAt).toEqual(now);
  });

  it('assainit le texte avant de l\'enregistrer', async () => {
    const created = await createAnnouncement(
      db,
      {
        title: 'Tournoi',
        bodyHtml: '<p onclick="alert(1)">Samedi</p><script>alert(2)</script><span>12</span>'
      },
      'bureau@nozaybad.fr'
    );

    expect(created.bodyHtml).toBe('<p>Samedi</p>12');
  });

  it('retire les espaces autour du titre', async () => {
    const created = await createAnnouncement(
      db,
      { title: '  Tournoi interne  ', bodyHtml: '<p>Texte</p>' },
      'bureau@nozaybad.fr'
    );

    expect(created.title).toBe('Tournoi interne');
  });

  it('refuse un texte que l\'assainissement vide de tout contenu', async () => {
    await expect(
      createAnnouncement(db, { title: 'Vide', bodyHtml: '<img src="x"><div>  </div>' }, 'bureau@nozaybad.fr')
    ).rejects.toThrow(/vide/i);
  });
});
