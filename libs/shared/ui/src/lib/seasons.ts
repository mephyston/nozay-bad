/**
 * Les saisons telles qu'un sélecteur les propose.
 *
 * Douze écrans construisaient cette liste à la main, chacun à sa façon : certains ajoutaient
 * « (Active) » — un état qui ne se choisit pas et n'aide pas à choisir —, aucun ne triait, si
 * bien que l'ordre dépendait de celui de la réponse serveur et changeait d'un écran à l'autre.
 *
 * Le tri est **croissant** : on lit un exercice comptable dans le sens du temps, et la saison la
 * plus récente se trouve alors en bas, à la place où on l'attend dans une liste chronologique.
 */
export interface SeasonLike {
  /* Facultatif comme dans les projections d'API : plusieurs écrans passent des saisons
     réduites au code et au nom, et exiger l'identifiant les obligeait à en inventer un. */
  id?: string | number | null;
  code?: string | null;
  name?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  closed?: boolean | number | null;
}

export interface SeasonOption {
  value: string;
  label: string;
}

/* `startDate` d'abord : c'est la seule clé qui ordonne à coup sûr. Le code (« 25-26 ») trie
   correctement tant qu'on reste dans le siècle, et sert de repli quand la projection l'omet. */
const cleDeTri = (s: SeasonLike) => String(s.startDate ?? s.code ?? s.name ?? s.id);

/**
 * La liste rendue dans l'ordre du temps, sans toucher à celle qu'on reçoit.
 *
 * Exportée à part de `toSeasonOptions` pour les sélecteurs qui rendent leurs `<option>`
 * eux-mêmes : le tri ne doit pas être la contrepartie d'une mise en forme.
 */
export function sortSeasons<T extends SeasonLike>(seasons: T[]): T[] {
  return [...seasons].sort((a, b) => cleDeTri(a).localeCompare(cleDeTri(b)));
}

/**
 * @param value quelle clé le sélecteur renvoie : le code de saison (défaut) ou l'identifiant.
 * @param markClosed signale les exercices clôturés, quand y écrire est impossible.
 */
export function toSeasonOptions(
  seasons: SeasonLike[],
  { value = 'code', markClosed = false }: { value?: 'code' | 'id'; markClosed?: boolean } = {}
): SeasonOption[] {
  return sortSeasons(seasons).map((s) => ({
    value: value === 'id' ? String(s.id) : String(s.code ?? s.id),
    label: `${s.name || s.code || `Saison ${s.id}`}${markClosed && s.closed ? ' — clôturée' : ''}`
  }));
}

/**
 * L'exercice dont les bornes contiennent une date, ou `undefined` si aucun ne la couvre.
 *
 * Une écriture se rattache à l'exercice de sa date, pas à celui que l'écran affiche : depuis
 * le 1er septembre, l'exercice consulté est le nouveau, et une ligne de relevé d'août — ou un
 * geste fait aujourd'hui depuis l'écran de l'exercice écoulé — tombe hors de ses bornes. La
 * garde serveur refuse alors sans motif de rattachement. Les projections qui omettent les
 * bornes ne trouvent rien : à l'appelant de retomber sur l'exercice consulté.
 */
export function seasonForDate<T extends SeasonLike>(seasons: T[], date: string): T | undefined {
  if (!date) return undefined;
  return seasons.find((s) => !!s.startDate && !!s.endDate && date >= s.startDate && date <= s.endDate);
}
