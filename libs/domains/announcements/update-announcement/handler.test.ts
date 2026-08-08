import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createAnnouncement } from '../create-announcement/handler';
import { updateAnnouncement } from './handler';

describe('updateAnnouncement', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  async function draft(title = 'Tournoi') {
    return createAnnouncement(db, { title, bodyHtml: '<p>Texte</p>' }, 'bureau@nozaybad.fr');
  }

  it('modifie le titre et le texte', async () => {
    const created = await draft();
    const updated = await updateAnnouncement(db, created.id, {
      title: 'Tournoi reporté',
      bodyHtml: '<p>Samedi 19</p>',
      status: 'draft'
    });

    expect(updated.title).toBe('Tournoi reporté');
    expect(updated.bodyHtml).toBe('<p>Samedi 19</p>');
  });

  it('date la publication au passage du brouillon à publiée', async () => {
    const created = await draft();
    const publishedAt = new Date('2026-08-08T10:00:00Z');

    const updated = await updateAnnouncement(
      db,
      created.id,
      { title: 'Tournoi', bodyHtml: '<p>Texte</p>', status: 'published' },
      publishedAt
    );

    expect(updated.publishedAt).toEqual(publishedAt);
  });

  it('ne réécrit pas la date de publication lors d\'une republication', async () => {
    const firstPublication = new Date('2026-08-01T10:00:00Z');
    const created = await createAnnouncement(
      db,
      { title: 'Tournoi', bodyHtml: '<p>Texte</p>', status: 'published' },
      'bureau@nozaybad.fr',
      firstPublication
    );

    // Repassage en brouillon, puis republication bien plus tard.
    await updateAnnouncement(
      db,
      created.id,
      { title: 'Tournoi', bodyHtml: '<p>Texte</p>', status: 'draft' },
      new Date('2026-08-05T10:00:00Z')
    );
    const republished = await updateAnnouncement(
      db,
      created.id,
      { title: 'Tournoi', bodyHtml: '<p>Texte</p>', status: 'published' },
      new Date('2026-08-20T10:00:00Z')
    );

    expect(republished.publishedAt).toEqual(firstPublication);
  });

  it('assainit le texte modifié', async () => {
    const created = await draft();
    const updated = await updateAnnouncement(db, created.id, {
      title: 'Tournoi',
      bodyHtml: '<p>Texte</p><script>alert(1)</script>',
      status: 'draft'
    });

    expect(updated.bodyHtml).toBe('<p>Texte</p>');
  });

  it('refuse une annonce inexistante', async () => {
    await expect(
      updateAnnouncement(db, 9999, { title: 'X', bodyHtml: '<p>Y</p>', status: 'draft' })
    ).rejects.toThrow(/introuvable/i);
  });
});
