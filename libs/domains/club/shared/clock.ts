/**
 * L'heure locale du club.
 *
 * Les Workers et les crons tournent en UTC ; les dates du domaine (saison, journée
 * d'interclubs, anniversaire) sont des jours civils **là où le club joue**. Le fuseau
 * est celui de `club_settings.timezone` — `Europe/Paris` pour la métropole, mais un
 * club de La Réunion vit quatre heures plus tôt et son « 7 h » n'est pas le nôtre.
 *
 * `en-CA` rend la date en ISO (« 2026-08-15 »), un découpage sûr : l'ordre des parties
 * d'un format localisé ne se lit pas par position.
 */

export const DEFAULT_TIMEZONE = 'Europe/Paris';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface LocalClock {
  /** `YYYY-MM-DD` */
  date: string;
  /** `YYYY-MM-DDTHH:mm`, heure locale naïve */
  dateTime: string;
  /** 0-23 */
  hour: number;
  /** `MON` … `SUN`, la forme des crons Cloudflare et de `club_settings.weekly_send_day`. */
  weekday: Weekday;
}

/** Un fuseau inconnu du moteur retombe sur la métropole plutôt que de lever. */
function safeTimeZone(timeZone: string | null | undefined): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || DEFAULT_TIMEZONE });
    return timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function localClock(now: Date, timeZone: string | null | undefined): LocalClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23'
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const hour = Number(get('hour'));
  const weekday = (get('weekday').slice(0, 3).toUpperCase() as Weekday) || 'MON';
  return { date, dateTime: `${date}T${get('hour')}:${get('minute')}`, hour, weekday: WEEKDAYS.includes(weekday) ? weekday : 'MON' };
}

/** Le jour civil du club, `YYYY-MM-DD`. */
export function localDate(now: Date, timeZone: string | null | undefined): string {
  return localClock(now, timeZone).date;
}
