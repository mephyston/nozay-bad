/**
 * Lecture du référentiel des saisons, pour les écrans qui portent un sélecteur.
 *
 * Chaque page en avait sa copie, et elles avaient divergé : les unes retombaient sur
 * `[]`, les autres écrivaient la charge utile entière dans `seasons`. Sur un refus,
 * cette charge vaut `{ success: false, error: … }` — un objet, pas un tableau — et le
 * `seasons.find(…)` suivant échouait en « seasons.find is not a function », message
 * qui ne dit ni qu'il s'agit d'un droit manquant, ni lequel.
 *
 * Le référentiel est servi par `/accounting/seasons`, derrière `accounting:seasons:read` :
 * un rôle à qui l'on accorde les interclubs sans ce droit passe la garde de page puis
 * bute ici. La fonction nomme donc le droit en clair plutôt que de laisser filer une
 * erreur de typage.
 */
export interface Season {
  id?: number;
  code: string;
  /* `seasons.name` est `NOT NULL` en base : la déclarer facultative obligeait quatre
     écrans à composer avec un nom absent qui n'arrive jamais. */
  name: string;
  startDate: string;
  endDate: string;
  /** Le drapeau de la configuration des saisons, `active = 1` sur une seule ligne. */
  active?: boolean | number;
  closed?: boolean | number;
}

export interface SeasonsResult {
  seasons: Season[];
  /** `null` quand la lecture a abouti. Sinon, un message affichable tel quel. */
  errorMsg: string | null;
}

export async function fetchSeasons(api: { fetch: typeof fetch }): Promise<SeasonsResult> {
  let res: Response;
  try {
    res = (await api.fetch('http://localhost/accounting/seasons')) as Response;
  } catch {
    return { seasons: [], errorMsg: 'Le référentiel des saisons est injoignable.' };
  }

  if (res.status === 403) {
    return {
      seasons: [],
      errorMsg:
        "Vous n'avez pas le droit de lire les saisons (accounting:seasons:read), " +
        'nécessaire au sélecteur de saison de cet écran.'
    };
  }

  if (!res.ok) {
    return { seasons: [], errorMsg: `Le référentiel des saisons a répondu ${res.status}.` };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { seasons: [], errorMsg: 'Réponse illisible du référentiel des saisons.' };
  }

  const data = (payload as { data?: unknown })?.data;
  // Exigé tableau, jamais deviné : c'est le repli sur la charge utile entière qui
  // transformait un refus en erreur de typage trois lignes plus bas.
  if (!Array.isArray(data)) {
    return { seasons: [], errorMsg: 'Référentiel des saisons inattendu.' };
  }

  return { seasons: sortSeasons(data as Season[]), errorMsg: null };
}

/**
 * Les saisons dans l'ordre du temps.
 *
 * `/accounting/seasons` répond par `id` décroissant : sans ce tri, chaque sélecteur
 * proposait la plus récente en tête, et le repli « la dernière du tableau » désignait
 * la plus **ancienne**. Le pendant côté composants est `sortSeasons` de `@nba/ui` ;
 * il est redit ici parce qu'un relais tourne dans le worker et n'a rien à tirer d'un
 * paquet de composants Svelte pour trois lignes.
 */
export function sortSeasons<T extends { startDate?: string; code?: string }>(seasons: T[]): T[] {
  return [...seasons].sort((a, b) =>
    String(a.startDate ?? a.code ?? '').localeCompare(String(b.startDate ?? b.code ?? ''))
  );
}

/**
 * Saison proposée par défaut dans un sélecteur : **l'active de la configuration**.
 *
 * C'est le choix qu'un utilisateur attend, et le seul qui soit le même partout : le
 * bureau désigne une saison active dans « Configuration des saisons », et tous les écrans
 * s'ouvrent dessus. La déduction par les dates, qui régnait ici, divergeait de celle des
 * écrans comptables dès que le bureau ouvrait la saison suivante en avance ou tardait à
 * clore la précédente — deux rubriques affichaient alors deux saisons différentes.
 *
 * Replis, dans l'ordre : la saison dont on est dans la fenêtre de dates, puis la plus
 * récente connue. Ils ne servent qu'à ne jamais ouvrir un écran sans saison si la table
 * venait à n'en marquer aucune active.
 */
export function currentSeasonCode(seasons: Season[], today = new Date()): string {
  const triees = sortSeasons(seasons);
  const iso = today.toISOString().slice(0, 10);

  const retenue =
    triees.find((s) => s.active === true || s.active === 1) ??
    triees.find((s) => s.startDate <= iso && iso <= s.endDate) ??
    triees[triees.length - 1];

  return retenue ? (retenue.code || String(retenue.id ?? '')) : '';
}
