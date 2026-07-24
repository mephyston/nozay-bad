import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { shopRouter } from '@nba/shop-api';
import { setupMockDb } from '@nba/db/test-utils';
import { productsTable } from '../../../libs/domains/shop/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@nba/db';

const app = new Hono<{ Bindings: { DB: any } }>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message }, err.status as any);
  }
  return c.json({ success: false, error: err.message }, 500);
});
app.route('/shop', shopRouter);

describe('Products API Endpoints', () => {
  it('supports product CRUD operations', async () => {
    const { mockD1, db } = await setupMockDb();

    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };

    const productCat = await db.get(sql`
      INSERT INTO product_categories (label, accounting_category_id, created_at)
      VALUES ('Cordages', ${boutiqueCat.id}, strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };

    // 1. Create a product (POST /shop/products)
    const createRes = await app.request('http://localhost/shop/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65', productCategoryId: productCat.id, priceCents: 1200, stock: 5 })
    }, { DB: mockD1 as any });

    expect(createRes.status).toBe(200);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(true);
    expect(createJson.data.name).toBe('Yonex BG65');
    expect(createJson.data.priceCents).toBe(1200);
    expect(createJson.data.stock).toBe(5);
    expect(createJson.data.active).toBe(true);
    expect(createJson.data.id).toBeDefined();

    const productId = createJson.data.id;

    // 2. Read products (GET /shop/products)
    const listRes = await app.request('http://localhost/shop/products', undefined, { DB: mockD1 as any });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json() as any;
    expect(listJson.success).toBe(true);
    expect(listJson.data).toHaveLength(1);
    expect(listJson.data[0].name).toBe('Yonex BG65');

    // 3. Update a product (PUT /shop/products/:id)
    const updateRes = await app.request(`http://localhost/shop/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65 Updated', priceCents: 1500, stock: 10, active: false })
    }, { DB: mockD1 as any });

    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.name).toBe('Yonex BG65 Updated');
    expect(updateJson.data.priceCents).toBe(1500);
    expect(updateJson.data.stock).toBe(10);
    expect(updateJson.data.active).toBe(false);

    // Verify it is updated in DB listing
    const verifyRes = await app.request('http://localhost/shop/products?active=false', undefined, { DB: mockD1 as any });
    const verifyJson = await verifyRes.json() as any;
    expect(verifyJson.data).toHaveLength(1);
    expect(verifyJson.data[0].name).toBe('Yonex BG65 Updated');
  });

  it('validates invalid inputs for product creation and updates', async () => {
    const { mockD1 } = await setupMockDb();

    // POST with missing name and invalid category
    const createRes = await app.request('http://localhost/shop/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'invalid-cat', price: -5, stock: -1 })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(400);
    const json = await createRes.json() as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Validation failed');

    // PUT with invalid fields
    const updateRes = await app.request('http://localhost/shop/products/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: -10 })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(400);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(false);
    expect(updateJson.error).toContain('Validation failed');
  });
});

describe('Orders API Endpoints', () => {
  it('processes orders and creates transaction on approval', async () => {
    const { mockD1, db } = await setupMockDb();

    // Insert a season
    await db.run(sql`
      INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at)
      VALUES (1, '25-26', 'Saison 2025-2026', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'))
    `);

    // Insert a Boutique category
    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };

    // Insert a member
    await db.run(sql`
      INSERT INTO members (id, licence, season_id, last_name, first_name, gender, birth_date, status, type, amount_due_cents, amount_received_cents, amount_remaining_cents, imported_at)
      VALUES (1, '123456', 1, 'Dupont', 'Jean', 'M', '1990-01-01', 'active', 'senior', 0, 0, 0, strftime('%s', 'now'))
    `);

    // Insert a product category
    const productCat = await db.get(sql`
      INSERT INTO product_categories (label, accounting_category_id, created_at)
      VALUES ('Volants', ${boutiqueCat.id}, strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };

    // Insert product
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', productCategoryId: productCat.id, priceCents: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // 1. Create order
    const createRes = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, memberId: 1, productId: 1, quantity: 2, paymentMethodId: 1 })
    }, { DB: mockD1 as any });

    expect(createRes.status).toBe(200);
    const orderJson = await createRes.json() as any;
    expect(orderJson.success).toBe(true);

    // 2. Approve order
    const approveRes = await app.request(`http://localhost/shop/orders/${orderJson.data.id}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });

    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json() as any;
    expect(approveJson.success).toBe(true);

    // Verify stock is decremented
    const prod = await db.select().from(productsTable).where(eq(productsTable.id, 1)).get();
    expect(prod!.stock).toBe(3);

    // Verify ledger entry created
    const ledgerEntries = await db.select().from(sql`ledger_entries` as any).all();
    expect(ledgerEntries.length).toBeGreaterThan(0);

    // 3. Read orders (GET /shop/orders)
    const getRes = await app.request('http://localhost/shop/orders', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    expect(getJson.data[0].order.id).toBe(orderJson.data.id);
    expect(getJson.data[0].member.lastName).toBe('Dupont');
    expect(getJson.data[0].product.name).toBe('Yonex BG65');
  });

  it('supports rejecting an order', async () => {
    const { mockD1, db } = await setupMockDb();

    // Insert season, member, product
    await db.run(sql`
      INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at)
      VALUES (1, '25-26', 'Saison 2025-2026', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'))
    `);
    await db.run(sql`
      INSERT INTO members (id, licence, season_id, last_name, first_name, gender, birth_date, status, type, amount_due_cents, amount_received_cents, amount_remaining_cents, imported_at)
      VALUES (1, '1234567', 1, 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, strftime('%s', 'now'))
    `);
    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    const productCat = await db.get(sql`
      INSERT INTO product_categories (label, accounting_category_id, created_at)
      VALUES ('Cordages', ${boutiqueCat.id}, strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', productCategoryId: productCat.id, priceCents: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // 1. Create order
    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, memberId: 1, productId: 1, quantity: 2, paymentMethodId: 1 })
    }, { DB: mockD1 as any });
    const order = (await res.json() as any).data;

    // 2. Reject order
    const rejectRes = await app.request(`http://localhost/shop/orders/${order.id}/reject`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes.status).toBe(200);
    const rejectJson = await rejectRes.json() as any;
    expect(rejectJson.data.status).toBe('rejected');

    // 3. Verify stock is unchanged
    const prod = await db.select().from(productsTable).where(eq(productsTable.id, 1)).get();
    expect(prod!.stock).toBe(5);

    // 4. Trying to approve rejected order should fail
    const approveRes = await app.request(`http://localhost/shop/orders/${order.id}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(approveRes.status).toBe(400);

    // 5. Trying to reject already rejected order should fail
    const rejectRes2 = await app.request(`http://localhost/shop/orders/${order.id}/reject`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes2.status).toBe(400);
  });

  it('creates order even if quantity is greater than stock', async () => {
    const { mockD1, db } = await setupMockDb();

    // Insert season, member, product
    await db.run(sql`
      INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at)
      VALUES (1, '25-26', 'Saison 2025-2026', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'))
    `);
    await db.run(sql`
      INSERT INTO members (id, licence, season_id, last_name, first_name, gender, birth_date, status, type, amount_due_cents, amount_received_cents, amount_remaining_cents, imported_at)
      VALUES (1, '1234567', 1, 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, strftime('%s', 'now'))
    `);
    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    const productCat = await db.get(sql`
      INSERT INTO product_categories (label, accounting_category_id, created_at)
      VALUES ('Cordages', ${boutiqueCat.id}, strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', productCategoryId: productCat.id, priceCents: 1200, stock: 1, active: true, createdAt: new Date() }).run();

    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, memberId: 1, productId: 1, quantity: 2, paymentMethodId: 1 })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });

  it('blocks order CRUD / mutations if the season is closed', async () => {
    const { mockD1, db } = await setupMockDb();

    // 1. Insert a closed season
    await db.run(sql`
      INSERT OR REPLACE INTO seasons (id, code, name, start_date, end_date, active, closed_at, created_at)
      VALUES (1, '25-26', 'Saison 2025-2026', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now'), strftime('%s', 'now'))
    `);

    // Insert member, product
    await db.run(sql`
      INSERT INTO members (id, licence, season_id, last_name, first_name, gender, birth_date, status, type, amount_due_cents, amount_received_cents, amount_remaining_cents, imported_at)
      VALUES (1, '1234567', 1, 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, strftime('%s', 'now'))
    `);
    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    const productCat = await db.get(sql`
      INSERT INTO product_categories (label, accounting_category_id, created_at)
      VALUES ('Cordages', ${boutiqueCat.id}, strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', productCategoryId: productCat.id, priceCents: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // Try creating an order on a closed season -> expect 400
    const createRes = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, memberId: 1, productId: 1, quantity: 2, paymentMethodId: 1 })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(400);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(false);
    expect(createJson.error).toBe('La saison est clôturée. Impossible de soumettre une commande.');

    // To test approval and rejection, insert a pending order directly bypassing endpoint
    await db.run(sql`
      INSERT INTO orders (id, season_id, member_id, product_id, quantity, total_amount, payment_method, status, created_at)
      VALUES (10, '25-26', 1, 1, 2, 2400, 'virement', 'pending', ${new Date().getTime()})
    `);

    // Try approving the order on closed season -> expect 400
    const approveRes = await app.request('http://localhost/shop/orders/10/approve', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(approveRes.status).toBe(400);
    const approveJson = await approveRes.json() as any;
    expect(approveJson.success).toBe(false);
    expect(approveJson.error).toBe('La saison est clôturée');

    // Try rejecting the order on closed season -> expect 400
    const rejectRes = await app.request('http://localhost/shop/orders/10/reject', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes.status).toBe(400);
    const rejectJson = await rejectRes.json() as any;
    expect(rejectJson.success).toBe(false);
    expect(rejectJson.error).toBe('La saison est clôturée');
  });

  it('validates invalid inputs for order creation', async () => {
    const { mockD1 } = await setupMockDb();

    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '', memberId: 0, productId: -1, quantity: 0, paymentMethod: 'invalid-method' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Validation failed');
  });

  it('should return 404 AppError when order is not found for approval', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await app.request('http://localhost/shop/orders/9999/approve', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(res.status).toBe(404);
    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error).toBe('Commande introuvable');
  });
});
