/**
 * Le calendrier du bloc « Jeu libre » : des semaines, et dans chaque semaine les seuls
 * jours qui ont une séance.
 *
 * Pur, sans API ni Astro : c'est ce que les tests exercent, et la page comme le bloc
 * s'y réfèrent pour lire et découper exactement la même période.
 *
 * Les dates sont des dates locales « AAAA-MM-JJ », résolues à midi UTC — même parti
 * que le domaine des créneaux : midi retombe sur le même jour civil quel que soit le
 * fuseau du Worker, et le changement d'heure ne décale rien.
 */

/** Deux semaines à défaut : celle en cours, et la suivante pour s'organiser. */
export const DEFAULT_OPEN_PLAY_WEEKS = 2;

const DAY_MS = 86_400_000;

const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Ajoute des jours à une date locale. */
export function addDays(date: string, days: number): string {
  return iso(new Date(atNoon(date).getTime() + days * DAY_MS));
}

/** Le lundi de la semaine d'une date — les semaines du club commencent le lundi. */
export function mondayOf(date: string): string {
  const weekday = atNoon(date).getUTCDay(); // 0 = dimanche
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

/**
 * Le dernier jour à lire : le dimanche de la dernière semaine affichée.
 *
 * On lit par semaines **entières**, et non par nombre de séances : une limite couperait
 * un dimanche en deux, et la colonne afficherait une partie des séances du jour.
 */
export function openPlayRangeEnd(today: string, weeks: number): string {
  return addDays(mondayOf(today), weeks * 7 - 1);
}

export interface OpenPlayDay<T> {
  date: string;
  sessions: T[];
}

export interface OpenPlayWeek<T> {
  /** Lundi de la semaine. */
  monday: string;
  /** La semaine en cours, qu'on annonce comme telle plutôt que par sa date. */
  current: boolean;
  /** Les jours qui ont au moins une séance, dans l'ordre. Vide : une semaine sans jeu libre. */
  days: OpenPlayDay<T>[];
}

/**
 * Range les séances en semaines, puis en jours.
 *
 * Chaque semaine demandée figure, même vide : une semaine sans séance est une
 * information — « pas de jeu libre » — et la taire laisserait croire à un oubli. Les
 * jours sans séance, eux, n'ouvrent pas de colonne : une semaine de week-end
 * donnerait cinq colonnes vides pour deux pleines.
 *
 * Les séances sont supposées triées par date puis par heure, ce que rend l'API ; une
 * séance hors de la période est ignorée.
 */
export function groupOpenPlayWeeks<T extends { date: string }>(
  sessions: readonly T[],
  today: string,
  weeks: number
): OpenPlayWeek<T>[] {
  const firstMonday = mondayOf(today);
  return Array.from({ length: weeks }, (_, index) => {
    const monday = addDays(firstMonday, index * 7);
    const sunday = addDays(monday, 6);
    const days: OpenPlayDay<T>[] = [];
    for (const session of sessions) {
      if (session.date < monday || session.date > sunday) continue;
      const last = days[days.length - 1];
      if (last?.date === session.date) last.sessions.push(session);
      else days.push({ date: session.date, sessions: [session] });
    }
    return { monday, current: index === 0, days };
  });
}
