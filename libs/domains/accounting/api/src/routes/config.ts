import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listAccountClasses,
  createAccountClass,
  updateAccountClass,
  deleteAccountClass
} from '../../../categories/handler';
import type { Bindings } from '../routes';

export const configRouter = new Hono<{ Bindings: Bindings }>();

// 6. CATEGORIES ROUTES
configRouter.get('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await listCategories(db);
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

configRouter.post('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const newCat = await createCategory(db, body);
    return c.json({ success: true, data: newCat });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

configRouter.put('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await updateCategory(db, id, body);
    if (!updated) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

configRouter.delete('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  try {
    const deleted = await deleteCategory(db, id);
    if (!deleted) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 7. ACCOUNT CLASSES ROUTES
configRouter.get('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await listAccountClasses(db);
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

configRouter.post('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  if (!body.code || !body.label || !body.type) {
    return c.json({ success: false, error: 'Le code, le libellé et le type sont obligatoires.' }, 400);
  }

  try {
    const newClass = await createAccountClass(db, body);
    return c.json({ success: true, data: newClass });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

configRouter.put('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await updateAccountClass(db, code, body);
    if (!updated) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

configRouter.delete('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const db = drizzle(c.env.DB);
  try {
    const deleted = await deleteAccountClass(db, code);
    if (!deleted) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
