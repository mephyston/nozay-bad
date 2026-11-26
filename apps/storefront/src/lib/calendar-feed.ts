/**
 * L'adresse d'abonnement à l'agenda : jeton, empreinte et liens par application.
 *
 * Le jeton naît et meurt ici : l'API ne reçoit que son empreinte, si bien qu'il ne figure
 * ni en base ni dans ses journaux. 256 bits aléatoires : impossible à deviner, et une
 * empreinte sans sel suffit pour un secret de cette taille.
 */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function generateCalendarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function isCalendarToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value);
}

export async function hashCalendarToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function calendarFeedUrl(origin: string, token: string): string {
  return new URL(`/calendrier/${token}.ics`, origin).toString();
}

export interface CalendarLinks {
  /** L'adresse telle quelle, à coller dans n'importe quelle application. */
  feed: string;
  /** Ouvre l'application de calendrier de l'appareil (iPhone, Mac, Outlook). */
  webcal: string;
  google: string;
}

export function calendarLinks(feedUrl: string): CalendarLinks {
  const webcal = feedUrl.replace(/^https?:/, 'webcal:');
  return {
    feed: feedUrl,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`
  };
}

/**
 * La page « Ajouter un agenda à partir de l'URL » de Google Agenda. L'application Android ne
 * sait pas s'abonner à une adresse, ni ouvrir le lien `?cid=` qu'elle intercepte : seul le site,
 * en version ordinateur, le propose.
 */
export const GOOGLE_ADD_BY_URL = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

/**
 * Le même lien, ouvert de force dans Chrome plutôt que dans l'application Google Agenda qui
 * s'en emparerait. Sans Chrome, le navigateur suit l'adresse ordinaire.
 */
export function androidBrowserLink(url: string = GOOGLE_ADD_BY_URL): string {
  const { host, pathname, search } = new URL(url);
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

/** Pour faire l'abonnement depuis un ordinateur : l'adresse ne se montre qu'une fois. */
export function calendarMailLink(feedUrl: string, firstName: string): string {
  const body = [
    `L'adresse d'abonnement à l'agenda de ${firstName} :`,
    '',
    feedUrl,
    '',
    `Sur un ordinateur, ouvrez ${GOOGLE_ADD_BY_URL}, collez l'adresse, puis « Ajouter un agenda ».`,
    "Sur le téléphone Android, dans l'application Google Agenda : Paramètres, touchez le nom du nouvel agenda, puis activez « Synchroniser ».",
    '',
    'Cette adresse donne accès à cet agenda : ne la transférez pas.'
  ].join('\n');
  return `mailto:?subject=${encodeURIComponent(`Agenda de ${firstName}`)}&body=${encodeURIComponent(body)}`;
}

/** Android, pour le parcours propre à Google Agenda. Lu côté navigateur seulement. */
export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** La cible du bouton d'ajout d'un seul rendez-vous. */
export type CalendarItemRef =
  | { kind: 'event'; id: number }
  | { kind: 'open-play'; id: number }
  | { kind: 'fixture'; teamId: number; dayNumber: number; slot?: number };

export function calendarItemQuery(item: CalendarItemRef): string {
  const ref =
    item.kind === 'fixture'
      ? `${item.teamId}-${item.dayNumber}${item.slot && item.slot > 1 ? `-${item.slot}` : ''}`
      : String(item.id);
  return new URLSearchParams({ kind: item.kind, ref }).toString();
}
