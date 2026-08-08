import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../create-page/handler';
import { savePageBlocks } from '../save-page-blocks/handler';
import { deletePage } from './handler';
import { resolveRoute } from '../../routing/resolve-route/handler';
import { CmsPageNotFoundError } from '../../shared/errors';

const AUTHOR = 'communication@nozaybad.fr';

describe('deletePage', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('supprime la page et ses blocs, et rend le chemin libéré', async () => {
    const page = await createPage(db, { title: 'Présentation' }, AUTHOR);
    await savePageBlocks(db, { pageId: page.id, blocks: [{ type: 'richtext', payload: { html: '<p>A</p>' } }] });

    const result = await deletePage(db, { pageId: page.id });

    expect(result).toEqual({ deleted: true, path: '/presentation/' });
    expect((await resolveRoute(db, { path: '/presentation/', includeDrafts: true })).kind).toBe('notfound');
  });

  it('refuse de supprimer une page qui a des sous-pages', async () => {
    // La clé étrangère les détacherait vers la racine sans rien dire, et leurs
    // chemins deviendraient faux.
    const parent = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    await createPage(db, { title: 'Partenaires', parentId: parent.id }, AUTHOR);

    await expect(deletePage(db, { pageId: parent.id })).rejects.toThrow(/sous-pages/);
  });

  it('refuse une page inexistante', async () => {
    await expect(deletePage(db, { pageId: 999 })).rejects.toThrow(CmsPageNotFoundError);
  });
});
