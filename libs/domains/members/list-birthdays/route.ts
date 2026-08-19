import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getBirthdaysForActiveSeason } from '../shared/queries';

export type Bindings = { DB: D1Database };

export const listBirthdaysRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Jour civil **à Paris**, exprimé en UTC.
 *
 * `getBirthdaysForActiveSeason` lit la date par ses accesseurs UTC — c'est ce que
 * fait le cron, qui s'exécute en milieu de journée et ne voit jamais la différence.
 * Ici la page est rendue à n'importe quelle heure : entre minuit et 2 h à Paris,
 * l'instant UTC appartient encore à la veille, et l'anniversaire du jour serait
 * annoncé avec un jour de retard. On recale donc le calendrier avant l'appel.
 */
function parisCalendarDay(now: Date): Date {
  // `en-CA` rend la date en ISO (« 2026-08-15 ») : un découpage sûr, là où l'ordre
  // des parties d'un format localisé ne se lit pas par position.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .format(now)
    .split('-')
    .map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Les anniversaires du jour, parmi les adhérents de la saison active.
 *
 * Même source que l'annonce poussée chaque matin (`birthday:daily`) : l'encart de
 * l'espace adhérent et la notification disent donc exactement la même chose, y
 * compris le 29 février.
 */
listBirthdaysRoute.get('/birthdays', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const db = createDb(c.env.DB);
  return c.json({
    success: true,
    data: await getBirthdaysForActiveSeason(db, parisCalendarDay(new Date()))
  });
});
