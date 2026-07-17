import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { shopRouter } from './routes';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { productsTable } from '@metacult/features-shop-data-access';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@metacult/shared-db';

const app = new Hono<{ Bindings: { DB: any } }>();
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  return c.json({ success: false, error: err.message }, 500);
});
app.route('/shop', shopRouter);

describe('Products API Endpoints', () => {
  it('supports product CRUD operations', async () => {
    const { mockD1 } = await setupMockDb();

    // 1. Create a product (POST /shop/products)
    const createRes = await app.request('http://localhost/shop/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65', category: 'string', price: 1200, stock: 5 })
    }, { DB: mockD1 as any });

    expect(createRes.status).toBe(200);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(true);
    expect(createJson.data.name).toBe('Yonex BG65');
    expect(createJson.data.category).toBe('string');
    expect(createJson.data.price).toBe(1200);
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

    // Test GET /shop/products with query filters
    const listResFilter1 = await app.request('http://localhost/shop/products?category=string', undefined, { DB: mockD1 as any });
    const listJsonFilter1 = await listResFilter1.json() as any;
    expect(listJsonFilter1.data).toHaveLength(1);

    const listResFilter2 = await app.request('http://localhost/shop/products?category=shuttlecock', undefined, { DB: mockD1 as any });
    const listJsonFilter2 = await listResFilter2.json() as any;
    expect(listJsonFilter2.data).toHaveLength(0);

    const listResFilter3 = await app.request('http://localhost/shop/products?active=true', undefined, { DB: mockD1 as any });
    const listJsonFilter3 = await listResFilter3.json() as any;
    expect(listJsonFilter3.data).toHaveLength(1);

    // 3. Update a product (PUT /shop/products/:id)
    const updateRes = await app.request(`http://localhost/shop/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65 Updated', price: 1500, stock: 10, active: false })
    }, { DB: mockD1 as any });

    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.name).toBe('Yonex BG65 Updated');
    expect(updateJson.data.price).toBe(1500);
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
      INSERT OR IGNORE INTO seasons (id, name, active, created_at)
      VALUES ('25-26', 'Saison 2025-2026', 1, ${new Date().getTime()})
    `);

    // Insert a Boutique category
    const boutiqueCat = await db.get(sql`
      INSERT INTO categories (admin_label, adherent_label, created_at)
      VALUES ('Boutique', 'Boutique', ${new Date().getTime()})
      RETURNING id
    `) as { id: number };

    // Insert a member
    await db.run(sql`
      INSERT INTO members (id, licence, season, last_name, first_name, gender, birth_date, status, type, amount_due, amount_received, amount_remaining, imported_at)
      VALUES (1, '1234567', '25-26', 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, ${new Date().getTime()})
    `);

    // Insert a product with stock = 5
    await db.insert(productsTable).values({
      id: 1,
      name: 'Yonex BG65',
      category: 'string' as any,
      price: 1200,
      stock: 5,
      active: true,
      createdAt: new Date()
    }).run();
    // 1. Post order
    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const orderJson = await res.json() as any;
    expect(orderJson.success).toBe(true);
    expect(orderJson.data.status).toBe('pending');
    expect(orderJson.data.totalAmount).toBe(2400); // 1200 * 2

    // 2. Approve
    const appRes = await app.request(`http://localhost/shop/orders/${orderJson.data.id}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(appRes.status).toBe(200);
    const json = await appRes.json() as any;
    expect(json.data.status).toBe('approved');
    expect(json.data.transactionId).toBeDefined();

    // 3. Verify stock is unchanged
    const updatedProd = await db.select().from(productsTable).where(eq(productsTable.id, 1)).get();
    expect(updatedProd!.stock).toBe(5);

    // 4. Verify transaction is created
    const tx = await db.get(sql`
      SELECT amount, category, member_id FROM transactions WHERE id = ${json.data.transactionId}
    `) as { amount: number; category: number; member_id: number };
    expect(tx).toBeDefined();
    expect(tx.amount).toBe(2400);
    expect(tx.category).toBe(boutiqueCat.id);
    expect(tx.member_id).toBe(1);

    // 5. Test GET /shop/orders
    const getRes = await app.request('http://localhost/shop/orders?season=25-26', undefined, { DB: mockD1 as any });
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
      INSERT OR IGNORE INTO seasons (id, name, active, created_at)
      VALUES ('25-26', 'Saison 2025-2026', 1, ${new Date().getTime()})
    `);
    await db.run(sql`
      INSERT INTO members (id, licence, season, last_name, first_name, gender, birth_date, status, type, amount_due, amount_received, amount_remaining, imported_at)
      VALUES (1, '1234567', '25-26', 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, ${new Date().getTime()})
    `);
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', category: 'string' as any, price: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // 1. Create order
    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
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
      INSERT OR IGNORE INTO seasons (id, name, active, created_at)
      VALUES ('25-26', 'Saison 2025-2026', 1, ${new Date().getTime()})
    `);
    await db.run(sql`
      INSERT INTO members (id, licence, season, last_name, first_name, gender, birth_date, status, type, amount_due, amount_received, amount_remaining, imported_at)
      VALUES (1, '1234567', '25-26', 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, ${new Date().getTime()})
    `);
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', category: 'string' as any, price: 1200, stock: 1, active: true, createdAt: new Date() }).run();

    const res = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });

  it('blocks order CRUD / mutations if the season is closed', async () => {
    const { mockD1, db } = await setupMockDb();

    // 1. Insert a closed season
    await db.run(sql`
      INSERT OR REPLACE INTO seasons (id, name, active, closed, created_at)
      VALUES ('25-26', 'Saison 2025-2026', 1, 1, ${new Date().getTime()})
    `);

    // Insert member, product
    await db.run(sql`
      INSERT INTO members (id, licence, season, last_name, first_name, gender, birth_date, status, type, amount_due, amount_received, amount_remaining, imported_at)
      VALUES (1, '1234567', '25-26', 'Dupont', 'Jean', 'M', '1990-01-01', 'valide', 'Competiteur', 25000, 0, 25000, ${new Date().getTime()})
    `);
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', category: 'string' as any, price: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // Try creating an order on a closed season -> expect 400
    const createRes = await app.request('http://localhost/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(400);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(false);
    expect(createJson.error).toBe('La saison est clôturée');

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
