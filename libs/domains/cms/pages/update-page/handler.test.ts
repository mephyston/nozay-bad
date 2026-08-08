import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../create-page/handler';
import { updatePage } from './handler';
import { getPage } from '../get-page/handler';
import { CmsCyclicParentError, CmsPathConflictError } from '../../shared/errors';

const AUTHOR = 'communication@nozaybad.fr';

describe('updatePage', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('renomme sans toucher au reste', async () => {
    const page = await createPage(db, { title: 'Présentation' }, AUTHOR);
    const updated = await updatePage(db, { pageId: page.id, title: 'Le club en bref' }, AUTHOR);

    expect(updated.title).toBe('Le club en bref');
    expect(updated.path).toBe('/presentation/');
  });

  it('déplace toute la descendance quand le slug change', async () => {
    // Le chemin est dénormalisé pour que résoudre une URL reste une seule lecture
    // indexée ; le prix est ce recalcul, qui doit être exhaustif.
    const club = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    const equipe = await createPage(db, { title: 'Notre équipe', parentId: club.id }, AUTHOR);
    const petit = await createPage(db, { title: 'Bureau', parentId: equipe.id }, AUTHOR);

    await updatePage(db, { pageId: club.id, slug: 'notre-club' }, AUTHOR);

    expect((await getPage(db, { pageId: equipe.id })).page.path).toBe('/notre-club/notre-equipe/');
    expect((await getPage(db, { pageId: petit.id })).page.path).toBe('/notre-club/notre-equipe/bureau/');
  });

  it('déplace la descendance quand le parent change', async () => {
    const club = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    const jeunes = await createPage(db, { title: 'Jeunes', slug: 'jeunes' }, AUTHOR);
    const minibad = await createPage(db, { title: 'Minibad', parentId: club.id }, AUTHOR);

    await updatePage(db, { pageId: minibad.id, parentId: jeunes.id }, AUTHOR);

    expect((await getPage(db, { pageId: minibad.id })).page.path).toBe('/jeunes/minibad/');
  });

  it('ne confond pas une page voisine avec une descendante', async () => {
    // `/le-club/` ne doit pas capter `/le-club-house/` : c'est pour cela que les
    // chemins stockés se terminent par une barre oblique.
    const club = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    const voisine = await createPage(db, { title: 'Club house', slug: 'le-club-house' }, AUTHOR);

    await updatePage(db, { pageId: club.id, slug: 'notre-club' }, AUTHOR);

    expect((await getPage(db, { pageId: voisine.id })).page.path).toBe('/le-club-house/');
  });

  it('refuse de ranger une page sous elle-même ou sous sa descendance', async () => {
    const club = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    const enfant = await createPage(db, { title: 'Partenaires', parentId: club.id }, AUTHOR);

    await expect(updatePage(db, { pageId: club.id, parentId: club.id }, AUTHOR)).rejects.toThrow(
      CmsCyclicParentError
    );
    await expect(updatePage(db, { pageId: club.id, parentId: enfant.id }, AUTHOR)).rejects.toThrow(
      CmsCyclicParentError
    );
  });

  it('refuse un déplacement vers une adresse occupée', async () => {
    await createPage(db, { title: 'Présentation', slug: 'presentation' }, AUTHOR);
    const autre = await createPage(db, { title: 'Autre', slug: 'autre' }, AUTHOR);

    await expect(updatePage(db, { pageId: autre.id, slug: 'presentation' }, AUTHOR)).rejects.toThrow(
      CmsPathConflictError
    );
  });
});
