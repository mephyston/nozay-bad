import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPost } from '../create-post/handler';
import { publishPost } from '../publish-post/handler';
import { listPosts } from './handler';

/**
 * La pagination des actualités.
 *
 * Elle était faite **après coup** : la requête chargeait l'archive entière — corps HTML
 * compris — et le découpage se faisait en mémoire. Rien ne s'en voyait tant que le club
 * comptait vingt articles ; le coût aurait grandi avec l'archive, sans jamais rien
 * signaler. Le découpage est passé en base, et ce qui est éprouvé ici est que le total,
 * lui, continue de compter **tout** ce qui correspond au filtre et non la seule page
 * rendue — sans quoi la pagination de l'administration afficherait « 3 sur 3 ».
 */
const AUTHOR = { email: 'communication@nozaybad.fr', name: 'Communication' };

describe('pagination des actualités', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    for (let i = 1; i <= 5; i += 1) {
      const post = await createPost(db, { title: `Actualité ${i}` }, AUTHOR);
      await publishPost(db, { postId: post.id, published: true });
    }
  });

  it('rend la page demandée et le total de la sélection', async () => {
    const page = await listPosts(db, { limit: 2, offset: 0 });

    expect(page.posts).toHaveLength(2);
    expect(page.total).toBe(5);
  });

  it('avance sans recouvrement ni trou', async () => {
    const [premiere, seconde, troisieme] = await Promise.all([
      listPosts(db, { limit: 2, offset: 0 }),
      listPosts(db, { limit: 2, offset: 2 }),
      listPosts(db, { limit: 2, offset: 4 })
    ]);

    const ids = [...premiere.posts, ...seconde.posts, ...troisieme.posts].map((p) => p.id);
    expect(new Set(ids).size).toBe(5);
    expect(troisieme.posts).toHaveLength(1);
    expect(troisieme.total).toBe(5);
  });

  it('continue de dire combien d’articles existent au-delà de la dernière page', async () => {
    const audela = await listPosts(db, { limit: 2, offset: 99 });

    expect(audela.posts).toEqual([]);
    /*
     * Le total vient normalement des lignes rendues ; sans ligne, il est recompté.
     * Répondre zéro ferait conclure « aucune actualité » à qui a simplement dépassé la
     * fin de la liste — c'est exactement le genre de régression qu'une optimisation
     * introduit sans bruit.
     */
    expect(audela.total).toBe(5);
  });
});
