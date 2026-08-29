import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { listAnnouncementsRoute } from './route';

/**
 * L'index des annonces.
 *
 * Ce qu'il faut éprouver n'est pas qu'il rende des articles — c'est qu'il n'en rende
 * ni trop ni pour le mauvais appelant. Une actualité réservée aux adhérents ne doit pas
 * révéler son titre au site public par le détour de cet index, et un brouillon n'a rien
 * à y faire : les deux fuites seraient invisibles, la réponse restant bien formée.
 */

async function seed(db: Awaited<ReturnType<typeof setupMockDb>>['db']) {
  const post = (
    id: number,
    titre: string,
    statut: string,
    visibilite: string,
    eventId: number | null
  ) =>
    sql`INSERT INTO cms_posts
      (id, slug, path, title, body_html, status, visibility, author_name, author_email,
       published_at, event_id, created_at, updated_at)
      VALUES (${id}, ${'a' + id}, ${'/actualites/a' + id}, ${titre}, '<p>corps</p>',
        ${statut}, ${visibilite}, 'Test', 'test@nozaybad.fr', ${1700000000 + id}, ${eventId}, 0, 0)`;

  await db.run(post(1, 'Tournoi de printemps', 'published', 'public', 10));
  await db.run(post(2, 'Rappel tournoi', 'published', 'public', 10));
  await db.run(post(3, 'Soirée réservée', 'published', 'private', 11));
  await db.run(post(4, 'Brouillon', 'draft', 'public', 12));
  await db.run(post(5, 'Sans rendez-vous', 'published', 'public', null));
}

const env = (mockD1: unknown) => ({ DB: mockD1 });

describe('GET /cms/posts/announcements', () => {
  it('ne rend que les actualités publiées qui annoncent un rendez-vous', async () => {
    const { mockD1, db } = await setupMockDb();
    await seed(db);

    const res = await listAnnouncementsRoute.request(
      '/posts/announcements',
      { headers: { 'x-caller': 'storefront' } },
      env(mockD1)
    );
    const body = (await res.json()) as { data: { posts: { id: number; eventId: number }[] } };

    // Ni le brouillon (4), ni l'article sans rendez-vous (5).
    expect(body.data.posts.map((p) => p.id)).toEqual([3, 2, 1]);
    // La plus récente d'abord : c'est elle qui l'emporte quand deux annoncent le même.
    expect(body.data.posts[0].eventId).toBe(11);
  });

  it("ne montre pas les actualités réservées au site public", async () => {
    const { mockD1, db } = await setupMockDb();
    await seed(db);

    const res = await listAnnouncementsRoute.request(
      '/posts/announcements',
      { headers: { 'x-caller': 'website' } },
      env(mockD1)
    );
    const body = (await res.json()) as { data: { posts: { id: number }[] } };

    expect(body.data.posts.map((p) => p.id)).toEqual([2, 1]);
  });

  it('ne transporte que ce qui sert au lien', async () => {
    const { mockD1, db } = await setupMockDb();
    await seed(db);

    const res = await listAnnouncementsRoute.request(
      '/posts/announcements?limit=1',
      { headers: { 'x-caller': 'storefront' } },
      env(mockD1)
    );
    const body = (await res.json()) as { data: { posts: Record<string, unknown>[] } };

    expect(body.data.posts).toHaveLength(1);
    // Le corps des articles reste en base : c'est tout l'objet de cette route.
    expect(Object.keys(body.data.posts[0]).sort()).toEqual([
      'eventId',
      'id',
      'path',
      'slug',
      'title'
    ]);
  });
});
