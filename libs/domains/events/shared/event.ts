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
