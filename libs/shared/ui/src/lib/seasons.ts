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
  id: string | number;
  code?: string | null;
  name?: string | null;
  startDate?: string | null;
  closed?: boolean | number | null;
}

export interface SeasonOption {
  value: string;
  label: string;
}

/**
 * @param value quelle clé le sélecteur renvoie : le code de saison (défaut) ou l'identifiant.
 * @param markClosed signale les exercices clôturés, quand y écrire est impossible.
 */
export function toSeasonOptions(
  seasons: SeasonLike[],
  { value = 'code', markClosed = false }: { value?: 'code' | 'id'; markClosed?: boolean } = {}
): SeasonOption[] {
  /* `startDate` d'abord : c'est la seule clé qui ordonne à coup sûr. Le code (« 25-26 ») trie
     correctement tant qu'on reste dans le siècle, et sert de repli quand la projection l'omet. */
  const sortKey = (s: SeasonLike) => String(s.startDate ?? s.code ?? s.name ?? s.id);

  return [...seasons]
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .map((s) => ({
      value: value === 'id' ? String(s.id) : String(s.code ?? s.id),
      label: `${s.name || s.code || `Saison ${s.id}`}${markClosed && s.closed ? ' — clôturée' : ''}`
    }));
}
