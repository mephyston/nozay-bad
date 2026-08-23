import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPost } from '../create-post/handler';
import { publishPost } from '../publish-post/handler';
import { listPosts } from '../list-posts/handler';
import { updatePost } from './handler';

/**
 * Antidatage d'une actualité.
 *
 * Le club ressaisit à la main des articles anciens. Sans date modifiable, ils
 * remontaient tous en tête du fil — à la date de leur saisie, et non à celle des faits
 * qu'ils racontent, ce qui rendait la relecture de la saison incompréhensible.
 */
const AUTHOR = { email: 'communication@nozaybad.fr', name: 'Communication' };
const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;

beforeEach(async () => {
  ({ db } = await setupMockDb());
});

describe('date de publication', () => {
  it('range l’actualité à la date qu’on lui donne, pas à celle de sa saisie', async () => {
    // Trois articles saisis le même jour, dont deux racontent des faits anciens.
    const recent = await createPost(db, { title: 'Tournoi de mars' }, AUTHOR, NOW);
    await publishPost(db, { postId: recent.id, published: true }, NOW);

    const ancien = await createPost(db, { title: 'Assemblée de septembre' }, AUTHOR, NOW);
    await publishPost(db, { postId: ancien.id, published: true }, NOW);
    await updatePost(db, { postId: ancien.id, publishedAt: new Date('2025-09-20T18:00:00Z') }, NOW);

    const intermediaire = await createPost(db, { title: 'Stage de Noël' }, AUTHOR, NOW);
    await publishPost(db, { postId: intermediaire.id, published: true }, NOW);
    await updatePost(db, { postId: intermediaire.id, publishedAt: new Date('2025-12-27T09:00:00Z') }, NOW);

    const { posts } = await listPosts(db, {});
    expect(posts.map((p) => p.title)).toEqual([
      'Tournoi de mars',
      'Stage de Noël',
      'Assemblée de septembre'
    ]);
  });

  it('laisse la date inchangée quand on ne la mentionne pas', async () => {
    const post = await createPost(db, { title: 'Soirée raclette' }, AUTHOR, NOW);
    await publishPost(db, { postId: post.id, published: true }, NOW);
    await updatePost(db, { postId: post.id, publishedAt: new Date('2025-11-05T20:00:00Z') }, NOW);

    // Une correction de texte ne doit pas remettre l'article à sa date de saisie.
    const updated = await updatePost(db, { postId: post.id, title: 'Soirée raclette 2025' }, NOW);

    expect(updated.title).toBe('Soirée raclette 2025');
    expect(updated.publishedAt?.toISOString()).toBe('2025-11-05T20:00:00.000Z');
  });

  it('retire la date quand on l’envoie vide', async () => {
    const post = await createPost(db, { title: 'Brouillon daté par erreur' }, AUTHOR, NOW);
    await publishPost(db, { postId: post.id, published: true }, NOW);

    const cleared = await updatePost(db, { postId: post.id, publishedAt: null }, NOW);
    expect(cleared.publishedAt).toBeNull();
  });

  it('naît publiée à la date fournie, brouillon sans elle', async () => {
    // C'est la règle que la reprise WordPress suivait déjà, désormais offerte à la
    // saisie manuelle : une date renseignée vaut mise en ligne.
    const dated = await createPost(
      db,
      { title: 'Article ressaisi', publishedAt: new Date('2025-10-01T12:00:00Z') },
      AUTHOR,
      NOW
    );
    expect(dated.status).toBe('published');
    expect(dated.publishedAt?.toISOString()).toBe('2025-10-01T12:00:00.000Z');

    const draft = await createPost(db, { title: 'Article en cours' }, AUTHOR, NOW);
    expect(draft.status).toBe('draft');
    expect(draft.publishedAt).toBeNull();
  });

  it('ne se laisse pas écraser par une remise en ligne', async () => {
    // `publish-post` ne pose la date qu'à la première mise en ligne : dépublier puis
    // republier un article antidaté ne doit pas le ramener à aujourd'hui.
    const post = await createPost(db, { title: 'Compte rendu 2025' }, AUTHOR, NOW);
    await publishPost(db, { postId: post.id, published: true }, NOW);
    await updatePost(db, { postId: post.id, publishedAt: new Date('2025-06-15T10:00:00Z') }, NOW);

    await publishPost(db, { postId: post.id, published: false }, NOW);
    const republished = await publishPost(db, { postId: post.id, published: true }, NOW);

    expect(republished.publishedAt?.toISOString()).toBe('2025-06-15T10:00:00.000Z');
  });
});
