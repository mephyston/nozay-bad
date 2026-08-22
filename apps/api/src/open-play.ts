import type { Context, Next } from 'hono';

/**
 * Drapeau de la fonctionnalité « jeu libre ».
 *
 * Les inscriptions aux créneaux de jeu libre arrivent par petits incréments fusionnés
 * dans `main` au fil de l'eau — c'est le modèle du dépôt (CONTRIBUTING §8.1 : les
 * branches sont courtes, une fonctionnalité inachevée part en `main` **éteinte derrière
 * un drapeau**, jamais laissée à mûrir de côté). Ce garde-fou est ce qui rend cette
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
 * ceux-là protègent la préproduction d'envois réels quand celui-ci protège la production
 * d'une fonctionnalité inachevée — d'où les valeurs inversées dans les `wrangler.json`.
 *
 * À retirer, avec la variable, une fois la fonctionnalité stabilisée en production : un
 * drapeau qui ne bascule plus est une indirection qui ment.
 */

/** Préfixe monté par le domaine `schedules`. */
const OPEN_PLAY_PREFIX = '/schedules/open-play';

export type OpenPlayFlagEnv = {
  OPEN_PLAY_ENABLED?: string;
};

export function isOpenPlayEnabled(env: OpenPlayFlagEnv | undefined | null): boolean {
  return env?.OPEN_PLAY_ENABLED === 'true';
}

/**
 * Le chemin relève-t-il du jeu libre ?
 *
 * Comparaison sur le segment complet et non sur le seul préfixe : sans la seconde
 * condition, un hypothétique `/schedules/open-playground` tomberait sous le drapeau.
 */
export function isOpenPlayPath(path: string): boolean {
  return path === OPEN_PLAY_PREFIX || path.startsWith(`${OPEN_PLAY_PREFIX}/`);
}

export function openPlayFeatureFlag() {
  return async (c: Context<{ Bindings: OpenPlayFlagEnv }>, next: Next) => {
    if (!isOpenPlayPath(c.req.path)) return next();
    if (isOpenPlayEnabled(c.env)) return next();
    return c.json({ success: false, error: 'Ressource introuvable' }, 404);
  };
}
