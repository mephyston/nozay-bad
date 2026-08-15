import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listNavItems } from './handler';
import { NAV_LOCATIONS, type NavLocation } from '../../shared/nav';

export type Bindings = { DB: D1Database };

export const listNavItemsRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Le filtre est validé contre `NAV_LOCATIONS`, et non contre une liste recopiée ici.
 *
 * Un emplacement inconnu vaut « pas de filtre », donc **tous** les menus : c'est ce
 * qui est arrivé à `legal`, ajouté partout sauf dans cette condition, et dont la
 * barre légale du site s'est retrouvée à afficher l'intégralité du menu principal.
 * Un paramètre non reconnu est silencieux par nature — la liste doit donc être
 * partagée, jamais réécrite.
 */
listNavItemsRoute.get('/nav', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const requested = c.req.query('location');
  const location = (NAV_LOCATIONS as readonly string[]).includes(requested ?? '')
    ? (requested as NavLocation)
    : undefined;
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await listNavItems(db, { location }) });
});
