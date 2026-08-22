/**
 * Règles de calendrier et garde-fous de saisie du jeu libre.
 *
 * Purs, sans base ni HTTP : ce sont eux que les tests exercent en premier, et le
 * validateur comme l'écran s'y réfèrent pour ne jamais proposer une valeur que l'API
 * refuserait.
 */

/** Seuil d'ouverture par défaut d'une séance créée sans consigne particulière. */
export const DEFAULT_MIN_PLAYERS = 4;

/**
 * Plafond d'invités par adhérent.
 *
 * Trois, là où un événement du club en accepte dix (`MAX_GUESTS`). Ce n'est pas la même
 * contrainte : une soirée raclette compte des couverts, un jeu libre compte des joueurs
 * sur des terrains qui en accueillent quatre. Trois invités forment un double complet
 * autour de leur hôte ; au-delà, c'est une sortie de groupe, et cela se discute avec le
 * bureau plutôt que par un formulaire.
 */
export const MAX_OPEN_PLAY_GUESTS = 3;

/** Date locale « AAAA-MM-JJ ». */
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * La date est-elle une vraie date du calendrier ?
 *
 * Le format seul ne suffit pas : « 2026-02-31 » le respecte. On reconstruit donc la date
 * et on vérifie qu'elle n'a pas glissé — c'est ce que fait le `Date` de JavaScript, qui
 * accepte silencieusement le 31 février et rend le 3 mars.
 */
export function isValidDate(value: string): boolean {
  if (!LOCAL_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * La séance est-elle encore à venir, au jour près ?
 *
 * Même règle que l'agenda : la comparaison porte sur la date seule, donc une séance
 * reste inscriptible jusqu'à minuit. On ne ferme pas à 14 h 01 sous prétexte qu'elle
 * commençait à 14 h — l'adhérent qui arrive en cours de séance doit pouvoir se compter,
 * c'est même à ce moment-là que le compte importe le plus.
 */
export function isUpcomingDate(date: string, now: Date): boolean {
  return date >= now.toISOString().slice(0, 10);
}

/**
 * Jour ISO d'une date locale : 1 = lundi … 7 = dimanche.
 *
 * Résolu à midi UTC, et non à minuit : midi retombe sur le même jour civil pour tout
 * fuseau de -11 à +12, ce qui neutralise le changement d'heure. À minuit, une date de
 * fin mars pourrait basculer sur la veille selon le fuseau du runtime, et la génération
 * en lot poserait les séances un jour trop tôt — un décalage qui ne se voit que deux
 * fois l'an.
 */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Les dates de l'intervalle, bornes comprises, dont le jour de semaine est retenu.
 *
 * Sert la génération en lot : `weekdays` vient des créneaux récurrents choisis, et le
 * résultat est la liste des jours où une séance doit exister.
 */
export function datesInRange(from: string, to: string, weekdays: Set<number>): string[] {
  const dates: string[] = [];
  const end = new Date(`${to}T12:00:00Z`);
  for (
    let cursor = new Date(`${from}T12:00:00Z`);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = cursor.toISOString().slice(0, 10);
    if (weekdays.has(isoWeekday(date))) dates.push(date);
  }
  return dates;
}

/** Nombre de jours entre deux dates locales, bornes comprises. */
export function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Amplitude maximale d'une génération en lot.
 *
 * Sans borne, une faute de frappe sur l'année — « 2036 » pour « 2026 » — produirait des
 * milliers d'insertions et dépasserait les limites de D1. Une saison tient largement
 * dans l'année.
 */
export const MAX_GENERATION_DAYS = 366;

/** Un invité doit porter un prénom **et** un nom : « ␣ » ne dit rien à l'ouvreur. */
export function isNamedGuest(guest: { firstName: string; lastName: string }): boolean {
  return guest.firstName.trim().length > 0 && guest.lastName.trim().length > 0;
}
