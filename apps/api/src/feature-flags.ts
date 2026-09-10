import type { Context, Next } from 'hono';

/**
 * Drapeaux de fonctionnalité, posés sur un préfixe de routes.
 *
 * Les fonctionnalités arrivent par petits incréments fusionnés dans `main` au fil de
 * l'eau — c'est le modèle du dépôt (CONTRIBUTING §8.1 : une fonctionnalité inachevée
 * part en `main` **éteinte derrière un drapeau**). Ce garde-fou est ce qui rend cette
 * intégration continue sans danger : la préproduction voit la fonctionnalité, la
 * production ne la voit pas.
 *
 * **404 et non 403**, délibérément. Un refus d'autorisation apprend qu'il y a quelque
 * chose derrière ; une fonctionnalité qui n'est pas encore livrée ne doit pas s'annoncer.
 * Le contrôle passe d'ailleurs **avant** `authorize()` : la question des droits ne se
 * pose pas sur une route qui, du point de vue de l'appelant, n'existe pas — sans quoi la
 * réponse dépendrait des permissions de chacun et trahirait le préfixe à qui les a.
 *
 * **Fail-closed** : toute valeur autre que la chaîne `"true"` éteint, y compris l'absence
 * de déclaration. Même convention que les `PUSH_*_ENABLED` du cron, à ceci près que
 * ceux-là protègent la préproduction d'envois réels quand ceux-ci protègent la production
 * d'une fonctionnalité inachevée — d'où les valeurs inversées dans les `wrangler.json`.
 *
 * Écrit une fois pour le jeu libre, généralisé quand les indiv ont demandé le même
 * verrou : deux copies auraient divergé au premier ajustement. Chaque drapeau reste à
 * retirer, avec sa variable, une fois la fonctionnalité stabilisée en production.
 */

export interface FeatureFlagSpec {
  /** Préfixe monté par le domaine, segment complet (« /schedules/open-play »). */
  prefix: string;
  /** Nom de la variable d'environnement qui l'allume. */
  flag: string;
}

/** Jeu libre : inscriptions des adhérents, invités nommés, bénévole ouvreur. */
export const OPEN_PLAY_FLAG: FeatureFlagSpec = { prefix: '/schedules/open-play', flag: 'OPEN_PLAY_ENABLED' };

/** Séances individuelles : soirées d'indiv, candidatures des compétiteurs, choix du coach. */
export const INDIV_FLAG: FeatureFlagSpec = { prefix: '/schedules/indiv', flag: 'INDIV_ENABLED' };

export function isFlagEnabled(env: Record<string, unknown> | undefined | null, flag: string): boolean {
  return env?.[flag] === 'true';
}

/**
 * Le chemin relève-t-il du préfixe ?
 *
 * Comparaison sur le segment complet et non sur le seul préfixe : sans la seconde
 * condition, un hypothétique `/schedules/open-playground` tomberait sous le drapeau.
 */
export function isUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function featureFlag(spec: FeatureFlagSpec) {
  return async (c: Context<{ Bindings: Record<string, unknown> }>, next: Next) => {
    if (!isUnderPrefix(c.req.path, spec.prefix)) return next();
    if (isFlagEnabled(c.env, spec.flag)) return next();
    return c.json({ success: false, error: 'Ressource introuvable' }, 404);
  };
}

export function indivFeatureFlag() {
  return featureFlag(INDIV_FLAG);
}
