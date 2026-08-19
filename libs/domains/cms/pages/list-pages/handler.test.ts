import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../create-page/handler';
import { publishPage } from '../publish-page/handler';
import { listPages } from './handler';

const AUTHOR = 'communication@nozaybad.fr';

describe('listPages', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('trie par chemin, ce qui reproduit l’arborescence à plat', async () => {
    const club = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    await createPage(db, { title: 'Partenaires', parentId: club.id }, AUTHOR);
    await createPage(db, { title: 'Agenda', slug: 'agenda' }, AUTHOR);

    expect((await listPages(db)).map((p) => p.path)).toEqual([
      '/agenda/',
      '/le-club/',
      '/le-club/partenaires/'
    ]);
  });

  it('filtre sur le statut', async () => {
    const page = await createPage(db, { title: 'Présentation' }, AUTHOR);
    await createPage(db, { title: 'Chantier', slug: 'chantier' }, AUTHOR);
    await publishPage(db, { pageId: page.id, published: true });

    expect((await listPages(db, { status: 'published' })).map((p) => p.slug)).toEqual(['presentation']);
    expect((await listPages(db, { status: 'draft' })).map((p) => p.slug)).toEqual(['chantier']);
  });
});
