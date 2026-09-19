import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { shopRouter } from '@nba/shop-api';
import { setupMockDb } from '@nba/db/test-utils';
import { sql } from 'drizzle-orm';
import { AppError } from '@nba/db';
import { insertMemberFixture } from '@nba/members/test-fixtures';

/**
 * Déclinaisons, catégorie modifiable, suppression et image d'un produit.
 *
 * Tout passe par les routes, contre une D1 réelle : ce sont les règles de rattachement
 * et de recopie (nom, catégorie) qui sont sous test, pas un dépôt simulé.
 */
const app = new Hono<{ Bindings: { DB: any; MEDIA?: any; IMAGES?: any } }>();
app.onError((err, c) => {
  if (err instanceof AppError) return c.json({ success: false, error: err.message }, err.status as any);
  return c.json({ success: false, error: err.message }, 500);
});
app.route('/shop', shopRouter);

const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const put = (body: unknown) => ({ ...json(body), method: 'PUT' });

async function seed() {
  const { mockD1, db } = await setupMockDb();
  const accounting = await db.get(sql`
    INSERT INTO categories (admin_label, adherent_label, created_at) VALUES ('Boutique', 'Boutique', strftime('%s', 'now')) RETURNING id
  `) as { id: number };
  const textile = await db.get(sql`
    INSERT INTO product_categories (label, accounting_category_id, created_at) VALUES ('Textile (test)', ${accounting.id}, strftime('%s', 'now')) RETURNING id
  `) as { id: number };
  const volants = await db.get(sql`
    INSERT INTO product_categories (label, accounting_category_id, created_at) VALUES ('Volants (test)', ${accounting.id}, strftime('%s', 'now')) RETURNING id
  `) as { id: number };
  const env = { DB: mockD1 as any };
  const create = async (body: Record<string, unknown>) => {
    const res = await app.request('http://localhost/shop/products', json(body), env);
    const out = await res.json() as any;
    return { status: res.status, data: out.data, error: out.error };
  };
  const list = async (query = '') => {
    const res = await app.request(`http://localhost/shop/products${query}`, undefined, env);
    return (await res.json() as any).data as any[];
  };
  return { mockD1, db, env, textile: textile.id, volants: volants.id, create, list };
}

describe('Déclinaisons d’un produit', () => {
  it('rattache une déclinaison à son parent et lui recopie nom et catégorie', async () => {
    const { textile, volants, create, list } = await seed();
    const parent = await create({ name: 'Maillot du club', productCategoryId: textile, priceCents: 1000, stock: 0, description: 'Le maillot officiel.' });
    expect(parent.status).toBe(200);

    // La catégorie envoyée est ignorée : celle du parent fait foi.
    const l = await create({ productCategoryId: volants, priceCents: 1200, stock: 3, trackStock: true, parentId: parent.data.id, variantLabel: ' L ' });
    expect(l.status).toBe(200);
    expect(l.data.name).toBe('Maillot du club');
    expect(l.data.productCategoryId).toBe(textile);
    expect(l.data.variantLabel).toBe('L');
    expect(l.data.description).toBeNull();

    const xs = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'XS' });
    expect(xs.status).toBe(200);

    const rows = await list();
    expect(rows.map((p) => p.displayName)).toEqual(['Maillot du club', 'Maillot du club — XS', 'Maillot du club — L']);
    expect(rows[0].categoryLabel).toBe('Textile (test)');
    expect(rows[0].ordersCount).toBe(0);
  });

  it('refuse une déclinaison sans libellé, sans parent existant, ou sous une déclinaison', async () => {
    const { textile, create } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const child = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'M' });

    const sansLibelle = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: '  ' });
    expect(sansLibelle.status).toBe(400);
    expect(sansLibelle.error).toContain('libellé');

    const parentInconnu = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: 9999, variantLabel: 'M' });
    expect(parentInconnu.status).toBe(400);
    expect(parentInconnu.error).toContain('parent');

    const sousDeclinaison = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: child.data.id, variantLabel: 'M' });
    expect(sousDeclinaison.status).toBe(400);
    expect(sousDeclinaison.error).toContain('déclinaison');

    const sansCategorie = await create({ name: 'Seul', priceCents: 1000, stock: 0 });
    expect(sansCategorie.status).toBe(400);
  });

  it('modifie la catégorie d’un produit et la répercute sur ses déclinaisons, avec le nom', async () => {
    const { textile, volants, create, list, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: volants, priceCents: 1000, stock: 0 });
    await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'L' });

    const res = await app.request(`http://localhost/shop/products/${parent.data.id}`, put({ name: 'Maillot du club', productCategoryId: textile }), env);
    expect(res.status).toBe(200);

    const rows = await list();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.name).toBe('Maillot du club');
      expect(row.productCategoryId).toBe(textile);
    }
    expect(rows[1].displayName).toBe('Maillot du club — L');
  });

  it('rattache un produit existant comme déclinaison, puis le détache', async () => {
    const { textile, volants, create, list, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const loose = await create({ name: 'Maillot Homme L', productCategoryId: volants, priceCents: 1000, stock: 0 });

    const attach = await app.request(`http://localhost/shop/products/${loose.data.id}`, put({ parentId: parent.data.id, variantLabel: 'L' }), env);
    expect(attach.status).toBe(200);
    let rows = await list();
    expect(rows[1]).toMatchObject({ id: loose.data.id, name: 'Maillot', productCategoryId: textile, variantLabel: 'L', parentId: parent.data.id });

    // Sans libellé, le rattachement est refusé.
    const other = await create({ name: 'Autre', productCategoryId: volants, priceCents: 1000, stock: 0 });
    const noLabel = await app.request(`http://localhost/shop/products/${other.data.id}`, put({ parentId: parent.data.id }), env);
    expect(noLabel.status).toBe(400);

    // Un produit qui a des déclinaisons ne peut pas en devenir une.
    const nested = await app.request(`http://localhost/shop/products/${parent.data.id}`, put({ parentId: other.data.id, variantLabel: 'x' }), env);
    expect(nested.status).toBe(409);

    const detach = await app.request(`http://localhost/shop/products/${loose.data.id}`, put({ parentId: null, name: 'Maillot Homme L' }), env);
    expect(detach.status).toBe(200);
    rows = await list();
    const detached = rows.find((p) => p.id === loose.data.id)!;
    expect(detached.parentId).toBeNull();
    expect(detached.variantLabel).toBeNull();
    expect(detached.name).toBe('Maillot Homme L');
  });

  it('retire les déclinaisons d’un parent inactif de la liste des produits actifs', async () => {
    const { textile, create, list, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'L' });
    await create({ name: 'Volants', productCategoryId: textile, priceCents: 2000, stock: 0 });

    await app.request(`http://localhost/shop/products/${parent.data.id}`, put({ active: false }), env);

    const actifs = await list('?active=true');
    expect(actifs.map((p) => p.displayName)).toEqual(['Volants']);
    expect(await list()).toHaveLength(3);
  });
});

describe('Suppression d’un produit', () => {
  it('supprime un produit jamais commandé, refuse un produit commandé ou parent', async () => {
    const { textile, create, list, env, db } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const child = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'L' });
    const ordered = await create({ name: 'Cordage', productCategoryId: textile, priceCents: 1500, stock: 0 });

    await db.run(sql`INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at) VALUES (1, '25-26', 'Saison', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'))`);
    await insertMemberFixture(db, {
      id: 1, licence: '123456', seasonId: 1, lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01',
      status: 'valide', type: 'senior', amountDueCents: 0, amountReceivedCents: 0, amountRemainingCents: 0
    });
    // Le moyen de paiement vient du référentiel semé : n'importe lequel fait l'affaire ici.
    await db.run(sql`INSERT INTO orders (season_id, member_id, product_id, quantity, total_amount_cents, payment_method_id, status, created_at)
      VALUES (1, 1, ${ordered.data.id}, 1, 1500, (SELECT id FROM payment_methods LIMIT 1), 'created', strftime('%s', 'now'))`);

    const parentRes = await app.request(`http://localhost/shop/products/${parent.data.id}`, { method: 'DELETE' }, env);
    expect(parentRes.status).toBe(409);
    expect((await parentRes.json() as any).error).toContain('déclinaisons');

    const orderedRes = await app.request(`http://localhost/shop/products/${ordered.data.id}`, { method: 'DELETE' }, env);
    expect(orderedRes.status).toBe(409);
    expect((await orderedRes.json() as any).error).toContain('commandé');
    expect((await list()).find((p) => p.id === ordered.data.id)?.ordersCount).toBe(1);

    const childRes = await app.request(`http://localhost/shop/products/${child.data.id}`, { method: 'DELETE' }, env);
    expect(childRes.status).toBe(200);
    const thenParent = await app.request(`http://localhost/shop/products/${parent.data.id}`, { method: 'DELETE' }, env);
    expect(thenParent.status).toBe(200);

    expect((await list()).map((p) => p.id)).toEqual([ordered.data.id]);
    const missing = await app.request('http://localhost/shop/products/9999', { method: 'DELETE' }, env);
    expect(missing.status).toBe(400);
  });
});

describe('Image d’un produit', () => {
  /** Un PNG minimal : l'en-tête suffit, le contenu n'est jamais décodé sans binding Images. */
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

  function bucket() {
    const objects = new Map<string, { bytes: ArrayBuffer; contentType?: string }>();
    return {
      objects,
      async head(key: string) { return objects.has(key) ? {} : null; },
      async put(key: string, bytes: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
        objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType });
      }
    };
  }

  const upload = (id: number, file: Blob | null, env: Record<string, unknown>) => {
    const form = new FormData();
    if (file) form.append('file', file, 'maillot.png');
    return app.request(`http://localhost/shop/products/${id}/image`, { method: 'POST', body: form }, env as any);
  };

  it('dépose l’image telle quelle sans binding Images, adressée par son contenu', async () => {
    const { textile, create, list, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const media = bucket();

    const res = await upload(parent.data.id, new Blob([png], { type: 'image/png' }), { ...env, MEDIA: media });
    expect(res.status).toBe(200);
    const { data } = await res.json() as any;
    expect(data.imageKey).toMatch(/^media\/[a-f0-9]{16}\/produit\.png$/);
    expect(media.objects.get(data.imageKey)?.contentType).toBe('image/png');
    expect((await list())[0].imageKey).toBe(data.imageKey);

    // Redéposer la même image ne réécrit rien.
    media.objects.clear();
    const again = await upload(parent.data.id, new Blob([png], { type: 'image/png' }), { ...env, MEDIA: media });
    expect(again.status).toBe(200);
    expect(media.objects.size).toBe(1);

    const removed = await app.request(`http://localhost/shop/products/${parent.data.id}/image`, { method: 'DELETE' }, env);
    expect(removed.status).toBe(200);
    expect((await list())[0].imageKey).toBeNull();
  });

  it('réduit l’image avec le binding Images et nomme la clé d’après le format rendu', async () => {
    const { textile, create, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const media = bucket();
    const images = {
      input: () => ({
        transform: () => ({
          output: async () => ({
            image: () => new Blob([new Uint8Array([9, 9, 9])]).stream(),
            contentType: () => 'image/webp'
          })
        })
      })
    };

    const res = await upload(parent.data.id, new Blob([png], { type: 'image/png' }), { ...env, MEDIA: media, IMAGES: images });
    expect(res.status).toBe(200);
    const { data } = await res.json() as any;
    expect(data.imageKey).toMatch(/^media\/[a-f0-9]{16}\/produit-800\.webp$/);
    expect(media.objects.get(data.imageKey)?.bytes.byteLength).toBe(3);
  });

  it('refuse une image sur une déclinaison, un format inconnu, ou sans fichier', async () => {
    const { textile, create, env } = await seed();
    const parent = await create({ name: 'Maillot', productCategoryId: textile, priceCents: 1000, stock: 0 });
    const child = await create({ name: 'x', priceCents: 1000, stock: 0, parentId: parent.data.id, variantLabel: 'L' });
    const media = bucket();

    const onVariant = await upload(child.data.id, new Blob([png], { type: 'image/png' }), { ...env, MEDIA: media });
    expect(onVariant.status).toBe(400);
    expect((await onVariant.json() as any).error).toContain('déclinaison');

    const svg = await upload(parent.data.id, new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/png' }), { ...env, MEDIA: media });
    expect(svg.status).toBe(400);

    const none = await upload(parent.data.id, null, { ...env, MEDIA: media });
    expect(none.status).toBe(400);
    expect(media.objects.size).toBe(0);
  });
});
