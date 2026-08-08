import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { resolveRoute } from './handler';
import { createPage } from '../../pages/create-page/handler';
import { publishPage } from '../../pages/publish-page/handler';
import { savePageBlocks } from '../../pages/save-page-blocks/handler';
import { cmsRedirectsTable } from '../../shared/schema';

const AUTHOR = 'communication@nozaybad.fr';

async function publishedPage(db: Db, title: string, slug: string) {
  const page = await createPage(db, { title, slug }, AUTHOR);
  await publishPage(db, { pageId: page.id, published: true });
  return page;
}

describe('resolveRoute', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('sert une page publiée avec ses blocs, dans l’ordre', async () => {
    const page = await publishedPage(db, 'Présentation', 'presentation');
    await savePageBlocks(db, {
      pageId: page.id,
      blocks: [
        { type: 'richtext', payload: { html: '<p>Premier</p>' } },
        { type: 'richtext', payload: { html: '<p>Second</p>' } }
      ]
    });

    const resolved = await resolveRoute(db, { path: '/presentation/' });

    expect(resolved.kind).toBe('page');
    if (resolved.kind !== 'page') return;
    expect(resolved.page.title).toBe('Présentation');
    expect(resolved.blocks).toEqual([
      { type: 'richtext', html: '<p>Premier</p>' },
      { type: 'richtext', html: '<p>Second</p>' }
    ]);
  });

  it('normalise le chemin entrant', async () => {
    await publishedPage(db, 'Présentation', 'presentation');

    for (const path of ['/presentation', '/presentation/', '/Presentation', '/presentation/?utm=x']) {
      expect((await resolveRoute(db, { path })).kind).toBe('page');
    }
  });

  it('cache un brouillon au site public, et le montre à l’administration', async () => {
    await createPage(db, { title: 'Chantier', slug: 'chantier' }, AUTHOR);

    expect((await resolveRoute(db, { path: '/chantier/' })).kind).toBe('notfound');
    expect((await resolveRoute(db, { path: '/chantier/', includeDrafts: true })).kind).toBe('page');
  });

  it('redirige en 301 vers la cible enregistrée', async () => {
    await db
      .insert(cmsRedirectsTable)
      .values({ fromPath: '/bureau/', toPath: '/notre-equipe/', statusCode: 301, createdAt: new Date() })
      .run();

    const resolved = await resolveRoute(db, { path: '/bureau/' });

    expect(resolved).toMatchObject({ kind: 'redirect', toPath: '/notre-equipe/', statusCode: 301 });
  });

  it('rend 410 quand la page a existé sans successeur — et non 404', async () => {
    // Un 410 sort de l'index de Google bien plus vite qu'un 404, et une 301 vers une
    // page sans rapport serait traitée comme une 404 déguisée.
    await db
      .insert(cmsRedirectsTable)
      .values({ fromPath: '/forum-2/', toPath: null, statusCode: 410, createdAt: new Date() })
      .run();

    expect((await resolveRoute(db, { path: '/forum-2/' })).kind).toBe('gone');
  });

  it('fait gagner la page sur la redirection de même chemin', async () => {
    // Si quelqu'un recrée une page à une adresse héritée de WordPress, elle doit
    // servir — la redirection n'a plus lieu d'être.
    await db
      .insert(cmsRedirectsTable)
      .values({ fromPath: '/forum-2/', toPath: '/', statusCode: 301, createdAt: new Date() })
      .run();
    await publishedPage(db, 'Forum', 'forum-2');

    expect((await resolveRoute(db, { path: '/forum-2/' })).kind).toBe('page');
  });

  it('compte les passages par une redirection', async () => {
    await db
      .insert(cmsRedirectsTable)
      .values({ fromPath: '/bureau/', toPath: '/notre-equipe/', statusCode: 301, createdAt: new Date() })
      .run();

    await resolveRoute(db, { path: '/bureau/' });
    await resolveRoute(db, { path: '/bureau/' });

    const [row] = await db.select().from(cmsRedirectsTable).all();
    expect(row.hitCount).toBe(2);
  });

  it('rend notfound sur un chemin inconnu, jamais une erreur', async () => {
    expect((await resolveRoute(db, { path: '/nimporte-quoi/' })).kind).toBe('notfound');
  });
});
