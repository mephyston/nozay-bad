import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { resolveRoute } from './handler';
import { createPage } from '../../pages/create-page/handler';
import { publishPage } from '../../pages/publish-page/handler';
import { savePageBlocks } from '../../pages/save-page-blocks/handler';
import { createPost } from '../../posts/create-post/handler';
import { updatePost } from '../../posts/update-post/handler';
import { publishPost } from '../../posts/publish-post/handler';
import { uploadMedia } from '../../media/upload-media/handler';
import { cmsRedirectsTable } from '../../shared/schema';

const AUTHOR = 'communication@nozaybad.fr';
const POST_AUTHOR = { email: AUTHOR, name: 'Communication' };

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

    // Ciblée par son chemin, jamais par sa position : les migrations sèment les
    // redirections héritées de WordPress, et la première ligne de la table n'est
    // pas celle que ce test vient d'insérer.
    const row = await db
      .select()
      .from(cmsRedirectsTable)
      .where(eq(cmsRedirectsTable.fromPath, '/bureau/'))
      .get();

    expect(row?.hitCount).toBe(2);
  });

  it('rend notfound sur un chemin inconnu, jamais une erreur', async () => {
    expect((await resolveRoute(db, { path: '/nimporte-quoi/' })).kind).toBe('notfound');
  });

  it('sert la couverture d’un article avec ses déclinaisons, par largeur croissante', async () => {
    // C'est l'élément LCP de la page d'article. Sans ses déclinaisons, le rendu retombe
    // sur l'original en pleine largeur — l'image la plus lourde du site, chargée en
    // priorité, quelle que soit la taille de l'écran.
    const store = { async has() { return false; }, async put() {} };
    const media = await uploadMedia(
      db, store, { bytes: new Uint8Array(64).fill(1).buffer, mimeType: 'image/png', width: 1600, height: 900 },
      { async resize(_b, { width, format }) { return { bytes: new Uint8Array(width).buffer, contentType: format }; } }
    );

    const post = await createPost(db, { title: 'Tournoi de rentrée' }, POST_AUTHOR);
    await updatePost(db, { postId: post.id, coverMediaId: media.id });
    await publishPost(db, { postId: post.id, published: true });

    const resolved = await resolveRoute(db, { path: post.path });

    expect(resolved.kind).toBe('post');
    if (resolved.kind !== 'post') return;
    expect(resolved.cover?.id).toBe(media.id);
    expect(resolved.coverVariants.map((v) => v.width)).toEqual([400, 400, 800, 800, 1200, 1200, 1600, 1600]);
  });

  it('rend une liste vide de déclinaisons quand l’article n’a pas de couverture', async () => {
    const post = await createPost(db, { title: 'Sans image' }, POST_AUTHOR);
    await publishPost(db, { postId: post.id, published: true });

    const resolved = await resolveRoute(db, { path: post.path });

    expect(resolved.kind).toBe('post');
    if (resolved.kind !== 'post') return;
    expect(resolved.cover).toBeNull();
    expect(resolved.coverVariants).toEqual([]);
  });

  /**
   * Les images du corps servies à leur taille utile.
   *
   * L'éditeur écrit le chemin de l'**original** : sans cette étape, une photo de
   * plusieurs mégaoctets est téléchargée entière pour s'afficher en 400 px. La
   * transformation vit sur le chemin de rendu, jamais dans le HTML enregistré.
   */
  async function mediaWithVariants(width: number) {
    const store = { async has() { return false; }, async put() {} };
    return uploadMedia(
      db,
      store,
      { bytes: new Uint8Array(64).fill(2).buffer, mimeType: 'image/webp', width, height: Math.round(width * 0.75) },
      { async resize(_b, { width: w, format }) { return { bytes: new Uint8Array(w).buffer, contentType: format }; } }
    );
  }

  it("sert les images du corps d'un article en plusieurs largeurs", async () => {
    const media = await mediaWithVariants(1600);
    const post = await createPost(db, { title: 'Blackminton' }, POST_AUTHOR);
    await updatePost(db, {
      postId: post.id,
      bodyHtml: `<p>Avant</p><img src="/media/${media.contentHash}/original.webp" alt="Blackminton" width="400" height="300">`
    });
    await publishPost(db, { postId: post.id, published: true });

    const resolved = await resolveRoute(db, { path: post.path });

    expect(resolved.kind).toBe('post');
    if (resolved.kind !== 'post') return;
    expect(resolved.post.bodyHtml).toContain('<picture>');
    expect(resolved.post.bodyHtml).toContain(`/media/${media.contentHash}/400.webp 400w`);
    // Le repli reste l'image d'origine : un défaut ici doit peser, pas effacer.
    expect(resolved.post.bodyHtml).toContain(`src="/media/${media.contentHash}/original.webp"`);
    // Et la largeur affichée gouverne le choix du navigateur.
    expect(resolved.post.bodyHtml).toContain('sizes="(max-width: 400px) 100vw, 400px"');
  });

  it('en fait autant pour un bloc de texte de page', async () => {
    const media = await mediaWithVariants(1600);
    const page = await publishedPage(db, 'Le club', 'le-club');
    await savePageBlocks(db, {
      pageId: page.id,
      blocks: [
        {
          type: 'richtext',
          payload: { html: `<img src="/media/${media.contentHash}/original.webp" alt="Salle" width="800" height="600">` }
        }
      ]
    });

    const resolved = await resolveRoute(db, { path: '/le-club/' });

    expect(resolved.kind).toBe('page');
    if (resolved.kind !== 'page') return;
    const richtext = resolved.blocks[0];
    expect(richtext.type).toBe('richtext');
    if (richtext.type !== 'richtext') return;
    expect(richtext.html).toContain('<source type="image/avif"');
  });

  it("laisse le texte intact quand l'image n'a aucune déclinaison", async () => {
    const post = await createPost(db, { title: 'Vieux billet' }, POST_AUTHOR);
    const body = '<img src="/media/ffffffffffffffff/original.jpg" alt="Ancienne" width="600" height="400">';
    await updatePost(db, { postId: post.id, bodyHtml: body });
    await publishPost(db, { postId: post.id, published: true });

    const resolved = await resolveRoute(db, { path: post.path });

    expect(resolved.kind).toBe('post');
    if (resolved.kind !== 'post') return;
    expect(resolved.post.bodyHtml).not.toContain('<picture>');
    expect(resolved.post.bodyHtml).toContain('src="/media/ffffffffffffffff/original.jpg"');
  });
});
