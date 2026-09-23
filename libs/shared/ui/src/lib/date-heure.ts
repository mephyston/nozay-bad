/**
 * Les deux moitiés d'un `datetime-local`.
 *
 * La valeur s'écrit « AAAA-MM-JJTHH:MM ». Le champ l'affiche en deux rangées — la
 * date, puis l'heure — et la recompose à chaque saisie : la valeur que l'appelant
 * lie ne change jamais de forme, et ses bornes restent comparables telles quelles.
 */

export const partieDate = (valeur: string | undefined): string => valeur?.split('T')[0] ?? '';

/** Les secondes, quand l'API les rend, ne concernent pas un champ à la minute. */
export const partieHeure = (valeur: string | undefined): string =>
  valeur?.split('T')[1]?.slice(0, 5) ?? '';

/**
 * Recompose une date-heure à partir de ses moitiés.
 *
 * Aucune des deux ne peut rester vide : « 2026-05-12T » n'est pas une date-heure
 * valide, et le champ se viderait sans rien dire. Une heure manquante prend
 * `heureParDefaut` ; une date manquante prend le jour même, puisqu'on vient de
 * choisir une heure pour quelque chose.
 */
export function composerDateHeure(
  jour: string,
  heure: string,
  { heureParDefaut = '18:00', aujourdhui = () => new Date() }: {
    heureParDefaut?: string;
    /** Injectable pour les tests : l'horloge de la suite est figée. */
    aujourdhui?: () => Date;
  } = {}
): string {
  const j = jour || aujourdhui().toISOString().slice(0, 10);
  return `${j}T${heure || heureParDefaut}`;
}

/**
 * Les composantes d'une date ISO (`AAAA-MM-JJ`), ou `null` si ce n'en est pas une.
 *
 * Extraites à la main **et non par `new Date(chaîne)`**, qui se lit en UTC : à l'ouest
 * de Greenwich, minuit UTC tombe la veille et la date affichée recule d'un jour.
 *
 * Aucun test ne peut attraper cette variante — sur un runner en UTC comme à Paris, les
 * deux lectures donnent le même jour, et forcer `process.env.TZ` dans une suite ne sert
 * à rien : Node fige le fuseau au premier `Date` du processus. D'où cette construction
 * par composantes, où la question ne se pose pas.
 */
export const composantesDeDate = (
  valeur: string
): { annee: number; mois: number; jour: number } | null => {
  const trouve = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur.trim());
  if (!trouve) return null;
  return { annee: Number(trouve[1]), mois: Number(trouve[2]), jour: Number(trouve[3]) };
};

/** `2026-10-11` → `dim. 11 oct.`. Rend la valeur telle quelle si ce n'est pas une date. */
export const jourCourt = (valeur: string): string => {
  const parts = composantesDeDate(valeur);
  if (!parts) return valeur;
  return new Date(parts.annee, parts.mois - 1, parts.jour).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

/** `2026-10` → `octobre 2026`. Sert d'en-tête aux listes groupées par mois. */
export const moisEnToutesLettres = (cle: string): string => {
  const parts = composantesDeDate(`${cle}-01`);
  if (!parts) return cle;
  return new Date(parts.annee, parts.mois - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
};
