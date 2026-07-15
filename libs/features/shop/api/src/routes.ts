import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray } from 'drizzle-orm';
import { productsTable, ordersTable } from '@metacult/features-shop-data-access';
import { sql } from 'drizzle-orm';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const shopRouter = new Hono<{ Bindings: Bindings }>();

shopRouter.get('/products', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const category = c.req.query('category');
  const activeStr = c.req.query('active');
  const db = drizzle(c.env.DB);
  let conditions = [];
  if (category) conditions.push(eq(productsTable.category, category as any));
  if (activeStr) conditions.push(eq(productsTable.active, activeStr === 'true'));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const products = await db.select().from(productsTable).where(whereClause).all();
  return c.json({ success: true, data: products });
});

shopRouter.post('/products', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const prod = await db.insert(productsTable).values({
    name: body.name,
    category: body.category,
    price: body.price,
    stock: body.stock,
    active: body.active !== false,
    createdAt: new Date()
  }).returning().get();
  return c.json({ success: true, data: prod });
});

shopRouter.put('/products/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const prod = await db.update(productsTable).set({
    name: body.name,
    price: body.price,
    stock: body.stock,
    active: body.active
  }).where(eq(productsTable.id, id)).returning().get();
  return c.json({ success: true, data: prod });
});

shopRouter.get('/orders', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);
  let conditions = [];
  if (season) conditions.push(eq(ordersTable.seasonId, season));
  if (status) conditions.push(eq(ordersTable.status, status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orders = await db.select().from(ordersTable).where(whereClause).all();

  const memberIds = Array.from(new Set(orders.map(o => o.memberId)));
  const productIds = Array.from(new Set(orders.map(o => o.productId)));

  let membersList: { id: number; lastName: string; firstName: string; licence: string }[] = [];
  let productsList: (typeof productsTable.$inferSelect)[] = [];

  if (memberIds.length > 0) {
    membersList = await db.select({
      id: sql<number>`id`,
      lastName: sql<string>`last_name`,
      firstName: sql<string>`first_name`,
      licence: sql<string>`licence`
    })
      .from(sql`members`)
      .where(inArray(sql`id`, memberIds))
      .all() as { id: number; lastName: string; firstName: string; licence: string }[];
  }
  if (productIds.length > 0) {
    productsList = await db.select().from(productsTable).where(inArray(productsTable.id, productIds)).all();
  }

  const membersMap = new Map(membersList.map(m => [m.id, m]));
  const productsMap = new Map(productsList.map(p => [p.id, p]));

  const mappedOrders = orders.map(order => ({
    order,
    member: membersMap.get(order.memberId),
    product: productsMap.get(order.productId)
  }));

  return c.json({ success: true, data: mappedOrders });
});

shopRouter.post('/orders', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const product = await db.select().from(productsTable).where(eq(productsTable.id, body.productId)).get();
  if (!product) {
    return c.json({ success: false, error: 'Produit inexistant' }, 400);
  }

  const order = await db.insert(ordersTable).values({
    seasonId: body.seasonId,
    memberId: body.memberId,
    productId: body.productId,
    quantity: body.quantity,
    totalAmount: product.price * body.quantity,
    paymentMethod: body.paymentMethod,
    status: 'pending',
    createdAt: new Date()
  }).returning().get();

  return c.json({ success: true, data: order });
});

shopRouter.post('/orders/:id/approve', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  let updatedOrder;
  try {
    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
    if (!order || order.status !== 'pending') {
      throw new Error('Commande invalide ou déjà traitée');
    }

    const member = await db.get(sql`
      SELECT id, last_name as lastName, first_name as firstName FROM members WHERE id = ${order.memberId}
    `) as { id: number; lastName: string; firstName: string } | undefined;
    if (!member) {
      throw new Error('Adhérent inexistant');
    }

    const product = await db.select().from(productsTable).where(eq(productsTable.id, order.productId)).get();
    if (!product) {
      throw new Error('Produit inexistant');
    }

    const boutiqueCat = await db.get(sql`
      SELECT id FROM categories WHERE admin_label = 'Boutique'
    `) as { id: number } | undefined;
    const boutiqueCatId = boutiqueCat ? boutiqueCat.id : null;

    const tx = await db.get(sql`
      INSERT INTO transactions (season_id, type, account_id, category, amount, date, payment_method, description, member_id, created_at)
      VALUES (${order.seasonId}, 'recette', 'current', ${boutiqueCatId}, ${order.totalAmount}, ${new Date().toISOString().split('T')[0]}, ${order.paymentMethod}, ${`Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`}, ${member.id}, ${new Date().getTime()})
      RETURNING id
    `) as { id: number };

    updatedOrder = await db.update(ordersTable)
      .set({ status: 'approved', transactionId: tx.id })
      .where(eq(ordersTable.id, id))
      .returning().get();
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }

  return c.json({ success: true, data: updatedOrder });
});

shopRouter.post('/orders/:id/reject', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  let updatedOrder;
  try {
    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
    if (!order) {
      throw new Error('Commande introuvable');
    }
    if (order.status !== 'pending') {
      throw new Error('Commande invalide ou déjà traitée');
    }

    updatedOrder = await db.update(ordersTable)
      .set({ status: 'rejected' })
      .where(eq(ordersTable.id, id))
      .returning().get();
  } catch (err: any) {
    const status = err.message === 'Commande introuvable' ? 404 : 400;
    return c.json({ success: false, error: err.message }, status);
  }

  return c.json({ success: true, data: updatedOrder });
});
