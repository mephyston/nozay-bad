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
