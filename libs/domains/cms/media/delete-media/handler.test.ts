import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { uploadMedia } from '../upload-media/handler';
import { deleteMedia } from './handler';
import { listMedia } from '../list-media/handler';
import { createPage } from '../../pages/create-page/handler';
import { cmsPagesTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { MediaStore } from '../upload-media/dto';

const store: MediaStore = { async has() { return false; }, async put() {} };
const bytes = (f: number) => new Uint8Array(32).fill(f).buffer;

describe('deleteMedia', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('retire le média du catalogue', async () => {
    const { media: media } = await uploadMedia(db, store, { bytes: bytes(1), mimeType: 'image/png', width: 8, height: 8 });
    await deleteMedia(db, { mediaId: media.id });
    expect(await listMedia(db)).toEqual([]);
  });

  it('refuse de supprimer un média encore utilisé par une page', async () => {
    // La clé étrangère est en `set null` : supprimer sans regarder viderait
    // silencieusement l'image de partage de la page.
    const { media: media } = await uploadMedia(db, store, { bytes: bytes(2), mimeType: 'image/png', width: 8, height: 8 });
    const page = await createPage(db, { title: 'Accueil', slug: 'accueil' }, 'a@b.fr');
    await db.update(cmsPagesTable).set({ ogImageMediaId: media.id }).where(eq(cmsPagesTable.id, page.id)).run();

    await expect(deleteMedia(db, { mediaId: media.id })).rejects.toThrow(/utilisé/);
    expect((await listMedia(db)).length).toBe(1);
  });

  it('refuse un média inexistant', async () => {
    await expect(deleteMedia(db, { mediaId: 999 })).rejects.toThrow(/introuvable/);
  });
});
