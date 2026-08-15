/** Date-heure locale ISO sans fuseau : « 2026-11-14T09:00 ». */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidLocalDateTime(value: string): boolean {
  return LOCAL_DATETIME.test(value);
}

/**
 * L'intervalle est-il cohérent ?
 *
 * Le format est à largeur fixe, donc la comparaison lexicographique équivaut à la
 * comparaison chronologique — sans fabriquer deux dates ni risquer un décalage de
 * fuseau au passage.
 */
export function isOrderedRange(start: string, end: string | null): boolean {
  if (!isValidLocalDateTime(start)) return false;
  if (end === null) return true;
  return isValidLocalDateTime(end) && end >= start;
}

/**
 * Plafond du nombre d'accompagnants.
 *
 * Ce n'est pas une jauge de l'événement — il n'y en a pas — mais un garde-fou de
 * saisie : au-delà, c'est une faute de frappe, pas une famille. Constante partagée par
 * le validateur et par la liste déroulante, pour que l'écran ne propose jamais une
 * valeur que l'API refuserait.
 */
export const MAX_GUESTS = 10;

/**
 * L'événement est-il encore à venir, au jour près ?
 *
 * Même règle que l'agenda public : la comparaison porte sur la date seule, donc un
 * rendez-vous reste ouvert jusqu'à minuit. On ne ferme pas les inscriptions à la
 * soirée raclette à 20 h 01 sous prétexte qu'elle commençait à 20 h.
 */
export function isUpcoming(startsAt: string, now: Date): boolean {
  return startsAt.slice(0, 10) >= now.toISOString().slice(0, 10);
}
