/**
 * L'horaire proposé à la création d'une séance, d'après le jour choisi.
 *
 * L'habitude du club : le dimanche matin à 10 h, le soir à 19 h 30 les autres jours. Ce n'est
 * qu'une proposition, que l'écran remplace tant que la personne n'a pas touché aux heures.
 */
const SUNDAY = { startTime: '10:00', endTime: '13:00' };
const EVENING = { startTime: '19:30', endTime: '22:30' };

/** Jour de la semaine d'une date « AAAA-MM-JJ », lue à midi UTC : aucun fuseau ne la fait glisser. */
function isSunday(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.getUTCDay() === 0;
}

/** Début et fin d'une séance de jeu libre. Sans date encore choisie : le soir. */
export function defaultOpenPlayHours(date: string): { startTime: string; endTime: string } {
  return { ...(date && isSunday(date) ? SUNDAY : EVENING) };
}

/** Début d'une soirée d'indiv : sa fin découle de ses créneaux. */
export function defaultIndivStartTime(date: string): string {
  return defaultOpenPlayHours(date).startTime;
}
