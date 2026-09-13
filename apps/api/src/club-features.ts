import type { Context, MiddlewareHandler, Next } from 'hono';
import { createDb } from '@nba/db';
import { getClubFeatures, forgetClubFeatures, type FeatureState, ALL_FEATURES_ON } from '@nba/club/settings';
import { matchRule } from './authz/matcher';

/**
 * Les fonctionnalités que le club a éteintes, appliquées aux routes.
 *
 * Successeur des drapeaux `OPEN_PLAY_ENABLED` et `INDIV_ENABLED` : ceux-là étaient des
 * variables de déploiement, les mêmes pour tous et invisibles du bureau. Ici c'est le
 * club qui décide, depuis son écran de configuration, et la table des routes
 * (`route-permissions.ts`, colonne `feature`) dit ce que chaque route suppose.
 *
 * **404 et non 403**, et **avant `authorize()`** — pour les raisons qui valaient déjà
 * pour les drapeaux : une fonctionnalité éteinte n'existe pas, et la réponse ne doit
 * pas dépendre des droits de l'appelant, sans quoi elle trahirait ce qu'il y a derrière.
 *
 * L'état est gardé trente secondes à l'échelle de l'isolate, comme les droits
 * (`authz/actor.ts`) : ce middleware s'exécute sur chaque requête, et relire la table à
 * chacune coûterait une lecture D1 par appel pour une donnée qui change quelques fois
 * par an. L'écriture depuis l'écran de configuration l'oublie aussitôt dans son isolate
 * (`forgetIsolateFeatures`) ; les autres rattrapent en trente secondes.
 */
export type ClubFeatureBindings = { DB: D1Database };

const FEATURES_TTL_MS = 30_000;

let garde: { state: FeatureState; expireA: number } | null = null;

export function forgetIsolateFeatures(): void {
  garde = null;
}

export async function isolateFeatures(env: ClubFeatureBindings, now = Date.now()): Promise<FeatureState> {
  if (garde && garde.expireA > now) return garde.state;
  const db = createDb(env.DB);
  // La mémoïsation par base ne sert à rien ici — l'instance est neuve — mais elle ne
  // doit pas garder une promesse en échec : on la vide dans tous les cas.
  try {
    const state = await getClubFeatures(db);
    garde = { state, expireA: now + FEATURES_TTL_MS };
    return state;
  } finally {
    forgetClubFeatures(db);
  }
}

export function requireClubFeature(): MiddlewareHandler<{ Bindings: ClubFeatureBindings }> {
  return async (c: Context<{ Bindings: ClubFeatureBindings }>, next: Next) => {
    const rule = matchRule(c.req.method, c.req.path);
    if (!rule?.feature) return next();

    // Sans base, on ne cache rien : c'est `authorize()` qui échouera avec le bon message.
    if (!c.env?.DB) return next();

    let features: FeatureState;
    try {
      features = await isolateFeatures(c.env);
    } catch (err) {
      // Une table illisible ne doit pas éteindre l'API entière : tout reste visible,
      // et les journaux le disent.
      console.error('[club] fonctionnalités illisibles, tout est tenu pour allumé :', err);
      features = ALL_FEATURES_ON;
    }

    if (features[rule.feature]) return next();
    return c.json({ success: false, error: 'Ressource introuvable' }, 404);
  };
}
