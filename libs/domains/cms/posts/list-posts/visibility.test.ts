import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPost } from '../create-post/handler';
import { publishPost } from '../publish-post/handler';
import { updatePost } from '../update-post/handler';
import { listPosts } from './handler';
import { resolveRoute } from '../../routing/resolve-route/handler';

/**
 * Le cloisonnement public / adhérents, vu du domaine.
 *
 * La décision « qui est l'appelant » vit dans la route ; ce qui est vérifié ici est ce
 * qu'elle obtient une fois traduite en filtre — y compris par le chemin le plus facile
 * à oublier : la **résolution d'adresse**, qui servirait sinon une actualité réservée
 * à qui devinerait son URL.
 */
const AUTHOR = { email: 'communication@nozaybad.fr', name: 'Communication' };

async function published(db: Db, title: string, visibility: 'public' | 'private') {
  const post = await createPost(db, { title, visibility }, AUTHOR);
  await publishPost(db, { postId: post.id, published: true });
  return post;
}

describe('visibilité des actualités', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('est publique par défaut — sens de la reprise WordPress', async () => {
    const post = await createPost(db, { title: 'Sans mention' }, AUTHOR);
    expect(post.visibility).toBe('public');
  });

  it('ne rend que les publiques quand le filtre est posé', async () => {
    await published(db, 'Tournoi ouvert', 'public');
    await published(db, 'Soirée bénévoles', 'private');

    const all = await listPosts(db, { status: 'published' });
    expect(all.posts.map((p) => p.title).sort()).toEqual(['Soirée bénévoles', 'Tournoi ouvert']);

    const publicOnly = await listPosts(db, { status: 'published', visibility: 'public' });
    expect(publicOnly.posts.map((p) => p.title)).toEqual(['Tournoi ouvert']);
    expect(publicOnly.total).toBe(1);
  });

  it("n'expose pas une actualité réservée par son adresse", async () => {
    const post = await published(db, 'Soirée bénévoles', 'private');

    // Le site public : rien, comme pour n'importe quelle adresse inexistante.
    const forWebsite = await resolveRoute(db, { path: post.path });
    expect(forWebsite.kind).toBe('notfound');

    // L'espace adhérent : l'actualité, entière.
    const forMembers = await resolveRoute(db, { path: post.path, includePrivate: true });
    expect(forMembers.kind).toBe('post');
  });

  it('se laisse restreindre après coup, et rouvrir', async () => {
    const post = await published(db, 'Info du bureau', 'public');

    const restricted = await updatePost(db, { postId: post.id, visibility: 'private' });
    expect(restricted.visibility).toBe('private');
    expect((await listPosts(db, { visibility: 'public' })).total).toBe(0);

    const reopened = await updatePost(db, { postId: post.id, visibility: 'public' });
    expect(reopened.visibility).toBe('public');
    expect((await listPosts(db, { visibility: 'public' })).total).toBe(1);
  });

  it('laisse la visibilité inchangée quand la modification ne la mentionne pas', async () => {
    const post = await published(db, 'Soirée bénévoles', 'private');
    const updated = await updatePost(db, { postId: post.id, title: 'Soirée bénévoles 2026' });
    expect(updated.visibility).toBe('private');
  });

  it('garde un brouillon invisible, quelle que soit sa visibilité', async () => {
    await createPost(db, { title: 'En préparation', visibility: 'public' }, AUTHOR);
    const listed = await listPosts(db, { status: 'published', visibility: 'public' });
    expect(listed.total).toBe(0);
  });
});
