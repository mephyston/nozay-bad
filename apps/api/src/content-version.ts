import type { Context, Next } from 'hono';
import { createDb } from '@nba/db';
import { bumpContentVersion } from '@nba/cms-api';
import { isOpenPlayPath } from './open-play';

/**
 * Invalidation du cache du site public après une écriture sur les créneaux.
 *
 * Le site met ses pages en cache au bord sous la version de contenu
 * (`withPageCache`/`withDataCache`, cf. `apps/website/src/lib/cache.ts`). Seul le
 * domaine CMS incrémentait cette version : une modification de créneau restait donc
 * invisible jusqu'à une heure de `s-maxage`, puis vingt-quatre de plus en
 * `stale-while-revalidate`, sans que rien ne signale la page périmée.
 *
 * Le rattrapage est ici et non dans les handlers du domaine : `schedules` et `cms` sont
 * deux **feuilles** par décision d'architecture — aucune ne dépend de l'autre, et
 * `@nx/enforce-module-boundaries` le fait respecter. C'est la composition qui revient à
 * l'application, exactement comme le site compose déjà un bloc `schedule` avec les
 * lignes servies par `/schedules`.
 *
 * Le jeu libre est exclu : ses séances ne paraissent pas sur le site, et une inscription
 * d'adhérent y est fréquente — invalider tout le cache à chacune reviendrait à ne plus
 * en avoir.
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Préfixe monté par `app.route('/schedules', schedulesRouter)`. */
const SCHEDULES_PREFIX = '/schedules';

/**
 * L'écriture change-t-elle ce que lit le site public ?
 *
 * Comparaison sur le segment complet, comme `isOpenPlayPath` et pour la même raison :
 * un `/schedulesomething` ne doit pas tomber dans le filet.
 */
export function affectsPublicSite(method: string, path: string): boolean {
  if (!WRITE_METHODS.has(method)) return false;
  const underSchedules = path === SCHEDULES_PREFIX || path.startsWith(`${SCHEDULES_PREFIX}/`);
  return underSchedules && !isOpenPlayPath(path);
}

export type ContentVersionBindings = { DB: D1Database };

export function invalidatePublicContent() {
  return async (c: Context<{ Bindings: ContentVersionBindings }>, next: Next) => {
    await next();

    if (!affectsPublicSite(c.req.method, c.req.path)) return;
    // Un refus n'a rien écrit : invalider serait vider le cache pour rien, et une
    // requête mal formée rejouée en boucle le viderait en continu.
    if (!c.res.ok) return;
    if (!c.env?.DB) return;

    // Jamais détaché : sous Workers, une promesse non attendue est annulée avec la
    // requête et l'invalidation ne partirait pas. Et jamais fatal : l'écriture, elle,
    // a réussi — la faire échouer après coup laisserait l'appelant croire le contraire.
    try {
      await bumpContentVersion(createDb(c.env.DB));
    } catch (err) {
      console.error({
        msg: 'bumpContentVersion a échoué, le site peut servir une page périmée',
        path: c.req.path,
        err: err instanceof Error ? err.message : String(err)
      });
    }
  };
}
