import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPost } from '../create-post/handler';
import { publishPost } from '../publish-post/handler';
import { notifyPost } from './handler';

/**
 * Reprise de la règle qui portait sur les annonces, plus la seule condition nouvelle :
 * une actualité **publique** ne se diffuse pas. Elle vit sur le site, où elle se lit
 * sans compte — la pousser sur les téléphones du club en ferait une alerte pour une
 * information de vitrine.
 */
const AUTHOR = { email: 'communication@nozaybad.fr', name: 'Communication' };

async function ready(db: Db, visibility: 'public' | 'private') {
  const post = await createPost(db, { title: 'Soirée bénévoles', visibility }, AUTHOR);
  await publishPost(db, { postId: post.id, published: true });
  return post;
}

describe('notifyPost', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('diffuse une actualité réservée et publiée, et l’horodate', async () => {
    const post = await ready(db, 'private');
    const result = await notifyPost(db, post.id);

    expect(result.id).toBe(post.id);
    expect(result.notifiedAt).toBeInstanceOf(Date);
    // Aucun appareil abonné dans une base de test : ce n'est pas une erreur.
    expect(result.queued).toBe(0);
  });

  it('refuse une seconde diffusion — c’est la garde qui protège du renvoi en boucle', async () => {
    const post = await ready(db, 'private');
    await notifyPost(db, post.id);
    await expect(notifyPost(db, post.id)).rejects.toThrow(/déjà été diffusée/);
  });

  it('refuse une actualité publique', async () => {
    const post = await ready(db, 'public');
    await expect(notifyPost(db, post.id)).rejects.toThrow(/réservée aux adhérents/);
  });

  it('refuse un brouillon, qui renverrait vers un écran vide', async () => {
    const post = await createPost(db, { title: 'En préparation', visibility: 'private' }, AUTHOR);
    await expect(notifyPost(db, post.id)).rejects.toThrow(/Publiez/);
  });

  it('refuse une actualité inexistante', async () => {
    await expect(notifyPost(db, 4242)).rejects.toThrow(/introuvable/);
  });
});
