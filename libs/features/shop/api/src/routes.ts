import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { productsTable, ordersTable } from '@metacult/features-shop-data-access';
// Cross-domain read: shop needs member names for order display and approval.
// Justified: same D1 database, same Worker — no Service Binding overhead.
// Declared explicitly in eslint.config.js boundaries (scope:shop allows scope:members read).
import { membersTable } from '@metacult/features-members-data-access';
// Cross-domain read: shop needs the 'Boutique' accounting category ID and transaction insertion.
import { categoriesTable, transactionsTable } from '@metacult/features-accounting-data-access';
import { isSeasonClosed } from '@metacult/shared-db';

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
    membersList = await db
      .select({
        id: membersTable.id,
        lastName: membersTable.lastName,
        firstName: membersTable.firstName,
        licence: membersTable.licence,
      })
      .from(membersTable)
      .where(inArray(membersTable.id, memberIds))
      .all();
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

  if (await isSeasonClosed(db, body.seasonId)) {
    return c.json({ success: false, error: 'La saison est clôturée' }, 400);
  }

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

  try {
    const updatedOrder = await db.transaction(async (tx) => {
      const order = await tx.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
      if (!order) throw new Error('Commande introuvable');
      if (order.status !== 'pending') {
        throw new Error('Commande invalide ou déjà traitée');
      }

      if (await isSeasonClosed(tx, order.seasonId)) {
        throw new Error('La saison est clôturée');
      }

      const member = await tx
        .select({
          id: membersTable.id,
          lastName: membersTable.lastName,
          firstName: membersTable.firstName,
        })
        .from(membersTable)
        .where(eq(membersTable.id, order.memberId))
        .get();
      if (!member) throw new Error('Adhérent inexistant');

      const product = await tx.select().from(productsTable).where(eq(productsTable.id, order.productId)).get();
      if (!product) throw new Error('Produit inexistant');

      const boutiqueCat = await tx
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.adminLabel, 'Boutique'))
        .get();
      const boutiqueCatId = boutiqueCat ? boutiqueCat.id : null;

      const today = new Date().toISOString().split('T')[0];
      const description = `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`;

      // 1. Insert the transaction and retrieve the generated ID
      const txRow = await tx
        .insert(transactionsTable)
        .values({
          seasonId: order.seasonId,
          type: 'recette',
          accountId: 'current',
          category: boutiqueCatId,
          amount: order.totalAmount,
          date: today,
          paymentMethod: order.paymentMethod as any,
          description,
          memberId: member.id,
          createdAt: new Date(),
        })
        .returning({ id: transactionsTable.id })
        .get();

      // 2. Update the order with optimistic locking
      const updated = await tx
        .update(ordersTable)
        .set({ status: 'approved', transactionId: txRow.id })
        .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
        .returning()
        .get();

      if (!updated) {
        throw new Error('CONFLIT');
      }

      return updated;
    });

    return c.json({ success: true, data: updatedOrder });
  } catch (err: any) {
    if (err.message === 'Commande introuvable') {
      return c.json({ success: false, error: err.message }, 404);
    }
    if (err.message === 'Commande invalide ou déjà traitée' || err.message === 'Adhérent inexistant' || err.message === 'Produit inexistant' || err.message === 'La saison est clôturée') {
      return c.json({ success: false, error: err.message }, 400);
    }
    if (err.message === 'CONFLIT') {
      return c.json({ success: false, error: 'Commande déjà traitée (conflit concurrent)' }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
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
    if (await isSeasonClosed(db, order.seasonId)) {
      throw new Error('La saison est clôturée');
    }

    updatedOrder = await db.update(ordersTable)
      .set({ status: 'rejected' })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
      .returning().get();

    if (!updatedOrder) {
      throw new Error('CONFLIT');
    }
  } catch (err: any) {
    if (err.message === 'Commande introuvable') {
      return c.json({ success: false, error: err.message }, 404);
    }
    if (err.message === 'Commande invalide ou déjà traitée' || err.message === 'La saison est clôturée') {
      return c.json({ success: false, error: err.message }, 400);
    }
    if (err.message === 'CONFLIT') {
      return c.json({ success: false, error: 'Commande déjà traitée (conflit concurrent)' }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }

  return c.json({ success: true, data: updatedOrder });
});
