import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveNavItem } from './handler';
import { listNavItems } from '../list-nav-items/handler';
import { createPage } from '../../pages/create-page/handler';

/**
 * Le menu hérité de WordPress est bâti sur des entrées qui ne mènent nulle part :
 * « Le club » n'est pas une page, c'est un chapeau au-dessus de « Présentation » et
 * « Notre équipe ». La règle testée ici est celle qui rend cette forme possible —
 * et celle qui l'interdit là où elle produirait un cul-de-sac.
 */
describe('saveNavItem — entrées conteneurs', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  const container = () =>
    saveNavItem(db, { location: 'header', label: 'Le club' });

  it('accepte une entrée de premier niveau sans cible', async () => {
    const item = await container();
    expect(item.pageId).toBeNull();
    expect(item.externalUrl).toBeNull();
  });

  it('rend son adresse nulle, pour que le site sache ne pas en faire un lien', async () => {
    await container();
    const [root] = await listNavItems(db, { location: 'header' });
    expect(root.href).toBeNull();
  });

  it('refuse une sous-entrée sans cible : elle ne mènerait nulle part', async () => {
    const parent = await container();
    await expect(
      saveNavItem(db, { location: 'header', label: 'Orpheline', parentId: parent.id })
    ).rejects.toThrow(/mener quelque part/);
  });

  it('accueille bien des sous-entrées, qui gardent leur adresse', async () => {
    const parent = await container();
    const page = await createPage(db, { title: 'Présentation', slug: 'presentation' }, 'a@b.fr');
    await saveNavItem(db, {
      location: 'header',
      label: 'Présentation',
      pageId: page.id,
      parentId: parent.id
    });

    const [root] = await listNavItems(db, { location: 'header' });
    expect(root.href).toBeNull();
    expect(root.children.map((child) => child.href)).toEqual([page.path]);
  });

  it('refuse toujours les deux cibles à la fois', async () => {
    const page = await createPage(db, { title: 'Accueil', slug: 'accueil' }, 'a@b.fr');
    await expect(
      saveNavItem(db, {
        location: 'header',
        label: 'Les deux',
        pageId: page.id,
        externalUrl: 'https://ffbad.org/'
      })
    ).rejects.toThrow();
  });

  it("laisse retirer la cible d'une entrée existante pour en faire un conteneur", async () => {
    const page = await createPage(db, { title: 'Le club', slug: 'le-club' }, 'a@b.fr');
    const item = await saveNavItem(db, { location: 'header', label: 'Le club', pageId: page.id });

    const updated = await saveNavItem(db, {
      navItemId: item.id,
      location: 'header',
      label: 'Le club'
    });
    expect(updated.pageId).toBeNull();
  });
});
