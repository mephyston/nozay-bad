import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { searchRouter, matches, forgetSearchSources } from './search';
import { forgetIsolateFeatures } from './club-features';

/**
 * La recherche de l'espace adhérent, contre une D1 réelle : chaque rubrique répond
 * à ses mots, sans accents, et se tait quand le club l'a éteinte.
 */
const app = new Hono<{ Bindings: { DB: any } }>();
app.route('/', searchRouter);

async function seed() {
  const { mockD1, db } = await setupMockDb();
  forgetIsolateFeatures();
  forgetSearchSources();
  await db.run(sql`INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at) VALUES (1, '25-26', 'Saison', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'))`);
  await insertMemberFixture(db, {
    id: 1, licence: '07104079', seasonId: 1, lastName: 'DUPONT', firstName: 'Jérôme', gender: 'M', birthDate: '1990-01-01',
    status: 'valide', type: 'senior', amountDueCents: 0, amountReceivedCents: 0, amountRemainingCents: 0
  });
  await db.run(sql`INSERT INTO cms_posts (slug, path, title, excerpt, body_html, status, visibility, author_name, author_email, published_at, created_at, updated_at)
    VALUES ('tournoi-de-noel', '/actualites/tournoi-de-noel', 'Tournoi de Noël', 'Inscriptions ouvertes', '<p></p>', 'published', 'private', 'Bureau', 'b@x.fr', strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))`);
  await db.run(sql`INSERT INTO cms_posts (slug, path, title, excerpt, body_html, status, visibility, author_name, author_email, published_at, created_at, updated_at)
    VALUES ('brouillon', '/actualites/brouillon', 'Tournoi secret', null, '<p></p>', 'draft', 'private', 'Bureau', 'b@x.fr', null, strftime('%s','now'), strftime('%s','now'))`);
  await db.run(sql`INSERT INTO cms_posts (slug, path, title, excerpt, body_html, status, visibility, author_name, author_email, published_at, created_at, updated_at)
    VALUES ('tournoi-public', '/actualites/tournoi-public/', 'Tournoi ouvert à tous', null, '<p></p>', 'published', 'public', 'Bureau', 'b@x.fr', strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))`);
  const page = await db.get(sql`INSERT INTO cms_pages (slug, path, title, status, template, seo_description, updated_by_email, published_at, created_at, updated_at)
    VALUES ('inscriptions', '/inscriptions/', 'Inscriptions', 'published', 'default', null, 'b@x.fr', strftime('%s','now'), strftime('%s','now'), strftime('%s','now')) RETURNING id`) as { id: number };
  await db.run(sql`INSERT INTO cms_page_blocks (page_id, position, type, payload) VALUES (${page.id}, 0, 'richtext', '{"type":"richtext","html":"<p>Apportez un certificat médical et le formulaire Poona.</p>"}')`);
  await db.run(sql`INSERT INTO club_events (slug, title, starts_at, category, venue_label, status, registration, created_at, updated_at)
    VALUES ('soiree-club', 'Soirée du club', '2030-06-20T19:00:00', 'vie_du_club', 'Gymnase Jean Moulin', 'published', 'open', strftime('%s','now'), strftime('%s','now'))`);
  const accounting = await db.get(sql`INSERT INTO categories (admin_label, adherent_label, created_at) VALUES ('Boutique', 'Boutique', strftime('%s', 'now')) RETURNING id`) as { id: number };
  const cat = await db.get(sql`INSERT INTO product_categories (label, accounting_category_id, created_at) VALUES ('Textile (test)', ${accounting.id}, strftime('%s', 'now')) RETURNING id`) as { id: number };
  const parent = await db.get(sql`INSERT INTO products (name, product_category_id, price_cents, stock, track_stock, active, description, created_at) VALUES ('Maillot du club', ${cat.id}, 1000, 0, 0, 1, 'Le maillot officiel', strftime('%s','now')) RETURNING id`) as { id: number };
  await db.run(sql`INSERT INTO products (name, product_category_id, price_cents, stock, track_stock, active, parent_id, variant_label, created_at) VALUES ('Maillot du club', ${cat.id}, 1000, 0, 0, 1, ${parent.id}, 'L', strftime('%s','now'))`);
  return { env: { DB: mockD1 as any }, db, parentId: parent.id };
}

const search = async (env: any, q: string, caller = 'storefront') => {
  const res = await app.request(`http://localhost/search?q=${encodeURIComponent(q)}&seasonCode=25-26`, { headers: { 'x-caller': caller } }, env);
  return (await res.json()) as any;
};

describe('matches', () => {
  it('exige chaque mot, sans accents ni casse', () => {
    expect(matches(['jerome', 'dupont'], 'Jérôme', 'DUPONT')).toBe(true);
    expect(matches(['jerome', 'martin'], 'Jérôme', 'DUPONT')).toBe(false);
  });
});

describe('GET /search', () => {
  it('ne cherche rien sous deux lettres', async () => {
    const { env } = await seed();
    const { data } = await search(env, 'j');
    expect(data).toEqual({ pages: [], members: [], posts: [], events: [], teams: [], products: [] });
  });

  it('trouve un adhérent, un article publié, un événement et un produit, chacun avec son chemin', async () => {
    const { env, parentId } = await seed();
    expect((await search(env, 'jerome')).data.members).toEqual([
      { kind: 'member', id: '07104079', title: 'Jérôme DUPONT', subtitle: 'Licence 07104079', href: '/adherents/07104079' }
    ]);
    const posts = (await search(env, 'tournoi')).data.posts;
    expect(posts.map((p: any) => p.href).sort()).toEqual(['/actualites#tournoi-de-noel', '/actualites#tournoi-public']);
    expect((await search(env, 'moulin')).data.events[0]).toMatchObject({ kind: 'event', href: '/agenda#soiree-club' });
    const products = (await search(env, 'maillot')).data.products;
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ kind: 'product', href: `/boutique?produit=${parentId}`, subtitle: 'Textile (test) · 1 choix' });
  });

  it('ne rend au site public que le public, quoi qu’on lui demande', async () => {
    const { env } = await seed();
    const data = (await search(env, 'tournoi', 'website')).data;
    expect(data.posts.map((p: any) => p.href)).toEqual(['/actualites/tournoi-public/']);
    expect((await search(env, 'dupont', 'website')).data.members).toEqual([]);
    expect((await search(env, 'maillot', 'website')).data.products).toEqual([]);
    // Les pages se cherchent dans leur texte, et seulement depuis le site.
    expect((await search(env, 'certificat medical', 'website')).data.pages).toEqual([
      { kind: 'page', id: '/inscriptions/', title: 'Inscriptions', subtitle: null, href: '/inscriptions/' }
    ]);
    expect((await search(env, 'certificat', 'storefront')).data.pages).toEqual([]);
  });

  it('se tait sur l’annuaire quand le club l’a éteint', async () => {
    const { env, db } = await seed();
    await db.run(sql`INSERT INTO club_features (feature, enabled, updated_at, updated_by_email) VALUES ('member_directory', 0, strftime('%s','now'), 'test')
      ON CONFLICT(feature) DO UPDATE SET enabled = 0`);
    forgetIsolateFeatures();
    forgetSearchSources();
    expect((await search(env, 'dupont')).data.members).toEqual([]);
  });
});
