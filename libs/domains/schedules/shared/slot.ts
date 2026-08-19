/** Format « HH:MM », sur 24 heures. */
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidTime(value: string): boolean {
  return TIME.test(value);
}

/**
 * Le créneau se termine-t-il après avoir commencé ?
 *
 * La comparaison lexicographique suffit sur « HH:MM » à format fixe, et évite de
 * fabriquer deux dates pour comparer des heures.
 */
export function isOrderedRange(start: string, end: string): boolean {
  return isValidTime(start) && isValidTime(end) && end > start;
}

/** Numéro de jour ISO : 1 = lundi, 7 = dimanche. */
export function isValidWeekday(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}
