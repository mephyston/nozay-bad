/**
 * Ce qu'une requête en cours de rendu doit pouvoir dire au middleware.
 *
 * Le site n'a ni session ni identité : il n'y avait jusqu'ici rien à transporter
 * d'une requête. Deux besoins l'imposent désormais, et tous deux concernent le cache.
 *
 *  - **La santé du rendu.** Chaque lecture du CMS retombe sur une valeur par défaut
 *    quand l'API ne répond pas (`?? []`, `SITE_SETTINGS_FALLBACK`) : la page sort en
 *    200, sans menu ni actualités, et le cache la fige alors une heure sur tout le
 *    réseau. Un repli doit donc se signaler, pour que la réponse soit servie mais
 *    jamais rangée.
 *  - **La version de contenu.** Elle est lue une fois par requête dans le middleware ;
 *    les lectures d'API l'utilisent comme clé de leur propre cache.
 *
 * Le canal passe par l'objet d'environnement plutôt que par les paramètres : chaque
 * composant appelle déjà `resolveEnv(Astro.locals)`, et le pied de page seul ferait
 * sinon traverser trois niveaux à un argument qui ne le regarde pas.
 *
 * `Symbol.for` et non `Symbol()` : le middleware et les pages sont assemblés en
 * modules distincts, un symbole local ne se retrouverait pas d'un côté à l'autre.
 */
export const RENDER_CONTEXT = Symbol.for('nba.website.render-context');

export interface RenderContext {
  /** Vrai dès qu'une lecture a échoué et qu'un repli a été servi à sa place. */
  degraded: boolean;
  /** Version de contenu de la requête, ou `null` si le cache est court-circuité. */
  version: number | null;
  /** Prolonge la vie du Worker le temps d'une écriture de cache. */
  waitUntil?: (promise: Promise<unknown>) => void;
  /**
   * Vrai quand la page affiche une donnée qui change sans publication — les inscrits
   * du jeu libre. Elle se range alors au bord pour une minute, et non pour la journée.
   */
  volatile: boolean;
}

export function createRenderContext(init: Partial<RenderContext> = {}): RenderContext {
  return { degraded: false, version: null, volatile: false, ...init };
}

/** Accroche le contexte à l'environnement rendu par `resolveEnv`. */
export function attachRenderContext<T extends object>(env: T, context: RenderContext | undefined): T {
  // Non énumérable : `env` est répandu (`{ ...cfEnv }`) et journalisé ; le contexte
  // n'a rien à faire dans ces copies, où il désignerait une autre requête.
  if (context) Object.defineProperty(env, RENDER_CONTEXT, { value: context, enumerable: false });
  return env;
}

export function renderContextOf(env: unknown): RenderContext | undefined {
  return (env as Record<symbol, RenderContext | undefined>)?.[RENDER_CONTEXT];
}

/**
 * Signale qu'une valeur par défaut a été servie à la place d'une lecture.
 *
 * Sans effet hors requête (tests, scripts) : l'absence de contexte veut dire que
 * personne n'écoute, et surtout pas un cache.
 */
export function markDegraded(env: unknown): void {
  const context = renderContextOf(env);
  if (context) context.degraded = true;
}

/**
 * Signale que la page affiche une donnée que la version de contenu ne suit pas.
 *
 * Les inscriptions au jeu libre changent à toute heure, et c'est voulu qu'elles
 * n'incrémentent pas la version : invalider tout le site à chaque inscription
 * reviendrait à ne plus avoir de cache (voir `apps/api/src/content-version.ts`). La page
 * qui les montre est donc seule à payer, par une durée de vie courte au bord.
 */
export function markVolatile(env: unknown): void {
  const context = renderContextOf(env);
  if (context) context.volatile = true;
}
