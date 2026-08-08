import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createAnnouncement } from '../create-announcement/handler';
import { listAnnouncements } from '../list-announcements/handler';
import { deleteAnnouncement } from './handler';

describe('deleteAnnouncement', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('supprime l\'annonce', async () => {
    const created = await createAnnouncement(
      db,
      { title: 'Tournoi', bodyHtml: '<p>Texte</p>' },
      'bureau@nozaybad.fr'
    );

    await deleteAnnouncement(db, created.id);

    expect(await listAnnouncements(db)).toHaveLength(0);
  });

  it('refuse une annonce inexistante', async () => {
    await expect(deleteAnnouncement(db, 9999)).rejects.toThrow(/introuvable/i);
  });
});
