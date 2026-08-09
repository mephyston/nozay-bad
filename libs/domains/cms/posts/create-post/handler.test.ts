import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPost } from './handler';
import { createPage } from '../../pages/create-page/handler';
import { listPosts } from '../list-posts/handler';
import { publishPost } from '../publish-post/handler';
import { savePostCategory } from '../../categories/save-post-category/handler';
import { CmsPathConflictError } from '../../shared/errors';

const AUTHOR = { email: 'communication@nozaybad.fr', name: 'Commission Communication' };

describe('createPost', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('place les actualités à plat, comme WordPress', async () => {
    // Ce sont ces adresses qui sont indexées : pas de préfixe /actualites/.
    const post = await createPost(db, { title: 'Le Blackminton est de retour !' }, AUTHOR);
    expect(post.path).toBe('/le-blackminton-est-de-retour/');
    expect(post.status).toBe('draft');
  });

  it('refuse une adresse déjà prise par une page', async () => {
    // Pages et articles partagent l'espace des URL : l'index unique de chaque table
    // ne voit pas le conflit, seul ce contrôle croisé le détecte.
    await createPage(db, { title: 'Agenda', slug: 'agenda' }, AUTHOR.email);
    await expect(createPost(db, { title: 'Agenda' }, AUTHOR)).rejects.toThrow(CmsPathConflictError);
  });

  it('assainit le corps avec le profil du site public', async () => {
    const post = await createPost(
      db,
      { title: 'Test', bodyHtml: '<h2>Titre</h2><script>alert(1)</script><p>Texte</p>' },
      AUTHOR
    );
    expect(post.bodyHtml).toBe('<h2>Titre</h2><p>Texte</p>');
  });

  it('publie d’emblée quand l’import fournit une date', async () => {
    const published = new Date('2025-12-20T10:00:00Z');
    const post = await createPost(db, { title: 'Import', publishedAt: published }, AUTHOR);
    expect(post.status).toBe('published');
    expect(post.publishedAt).toEqual(published);
  });

  it('rattache les catégories', async () => {
    const category = await savePostCategory(db, { name: 'Jeunes' });
    await createPost(db, { title: 'Stage jeunes', categoryIds: [category.id] }, AUTHOR);

    const { posts } = await listPosts(db, { categorySlug: 'jeunes' });
    expect(posts.map((p) => p.title)).toEqual(['Stage jeunes']);
  });
});

describe('listPosts', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('trie par date de publication, pas de création', async () => {
    // Un brouillon rédigé la semaine dernière puis publié aujourd'hui doit passer
    // devant un article publié hier.
    const ancien = await createPost(db, { title: 'Ancien' }, AUTHOR);
    const recent = await createPost(db, { title: 'Récent' }, AUTHOR);
    await publishPost(db, { postId: ancien.id, published: true }, new Date('2026-01-01T10:00:00Z'));
    await publishPost(db, { postId: recent.id, published: true }, new Date('2026-02-01T10:00:00Z'));

    const { posts } = await listPosts(db, { status: 'published' });
    expect(posts.map((p) => p.title)).toEqual(['Récent', 'Ancien']);
  });

  it('rend une liste vide pour une catégorie inconnue, jamais tout', async () => {
    await createPost(db, { title: 'Un article' }, AUTHOR);
    const { posts, total } = await listPosts(db, { categorySlug: 'nexiste-pas' });
    expect(posts).toEqual([]);
    expect(total).toBe(0);
  });

  it('pagine en rendant le total du filtre', async () => {
    for (let i = 0; i < 5; i++) await createPost(db, { title: `Article ${i}` }, AUTHOR);
    const { posts, total } = await listPosts(db, { limit: 2, offset: 2 });
    expect(posts).toHaveLength(2);
    expect(total).toBe(5);
  });
});

describe('savePostCategory', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('est idempotent par slug — l’import rejoue sans dupliquer', async () => {
    const first = await savePostCategory(db, { name: 'Interclubs' });
    const second = await savePostCategory(db, { name: 'Interclubs' });
    expect(second.id).toBe(first.id);
  });
});
