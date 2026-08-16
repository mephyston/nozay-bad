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
  code: string;
  name?: string;
  startDate: string;
  endDate: string;
  active?: boolean;
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

  return { seasons: data as Season[], errorMsg: null };
}

/**
 * Saison à afficher par défaut : celle qui court aujourd'hui, à défaut la première.
 *
 * Déduite des dates et jamais du drapeau comptable `active`, qui bascule à la clôture
 * — à une date sans rapport avec la saison sportive.
 */
export function currentSeasonCode(seasons: Season[], today = new Date()): string {
  const iso = today.toISOString().slice(0, 10);
  const current = seasons.find((s) => s.startDate <= iso && iso <= s.endDate);
  return current?.code ?? seasons[0]?.code ?? '';
}
