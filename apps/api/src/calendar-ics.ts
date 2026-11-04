import { DEFAULT_TIMEZONE } from '@nba/club/settings';

/**
 * Le format iCalendar (RFC 5545), sans rien de métier.
 *
 * **Le fuseau.** Les dates du club sont stockées en heure locale, sans fuseau. Elles sont
 * converties ici en instants UTC depuis le fuseau du club (`club_settings.timezone`),
 * heure d'été comprise. Écrire `...Z` plutôt que `TZID=` dispense du bloc `VTIMEZONE` que
 * la norme exige alors, et qu'il faudrait générer pour n'importe quel fuseau. Chaque agenda
 * affiche ensuite l'heure dans le fuseau de son propriétaire : la bonne, y compris depuis
 * l'étranger.
 *
 * Une date **sans heure** reste une date : `VALUE=DATE` ne se convertit pas, sans quoi un
 * dimanche de vétérans pourrait glisser sur le samedi.
 */
export interface CalendarItem {
  /** Identifiant stable : c'est lui qui fait qu'un rendez-vous se met à jour sans doublon. */
  uid: string;
  title: string;
  /** Date locale : « 2026-11-14 » ou « 2026-11-14T09:00 ». */
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  url: string | null;
  cancelled: boolean;
}

/** Faute de fin connue : un créneau raisonnable, une durée nulle ne s'affichant pas. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

interface Wall {
  ms: number;
  timed: boolean;
}

function parseLocal(value: string): Wall | null {
  const m = LOCAL.exec(value);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  return Number.isNaN(ms) ? null : { ms, timed: m[4] !== undefined };
}

export function isValidLocalDate(value: string): boolean {
  return parseLocal(value) !== null;
}

/** Convertit l'heure murale du club en instant. Un seul format par appel : il coûte cher. */
export function clubClock(timeZone: string | null | undefined): (wallMs: number) => number {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = format(timeZone || DEFAULT_TIMEZONE);
  } catch {
    formatter = format(DEFAULT_TIMEZONE);
  }

  const offsetAt = (instant: number): number => {
    const parts: Record<string, number> = {};
    for (const part of formatter.formatToParts(new Date(instant))) parts[part.type] = Number(part.value);
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(instant / 1000) * 1000;
  };

  // Deux passes : la première estimation peut tomber de l'autre côté d'un changement d'heure.
  return (wallMs) => {
    const first = wallMs - offsetAt(wallMs);
    return wallMs - offsetAt(first);
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function dateStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function instantStamp(ms: number): string {
  const d = new Date(ms);
  return `${dateStamp(ms)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Les bornes d'un rendez-vous, fin exclusive pour une journée entière (RFC 5545). */
function bounds(item: CalendarItem, toInstant: (wallMs: number) => number) {
  const start = parseLocal(item.start);
  if (!start) throw new Error(`Date de rendez-vous illisible : ${item.start}`);
  const end = item.end ? parseLocal(item.end) : null;

  if (item.allDay || !start.timed) {
    const startDay = Math.floor(start.ms / DAY_MS) * DAY_MS;
    const lastDay = end && end.ms >= startDay ? Math.floor(end.ms / DAY_MS) * DAY_MS : startDay;
    return { allDay: true as const, start: dateStamp(startDay), end: dateStamp(lastDay + DAY_MS) };
  }
  const startMs = toInstant(start.ms);
  const endMs = end && end.ms > start.ms ? toInstant(end.ms) : startMs + DEFAULT_DURATION_MS;
  return { allDay: false as const, start: instantStamp(startMs), end: instantStamp(endMs) };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Replie à 75 octets sans jamais couper un caractère : la limite de la norme est en octets. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Une ligne de suite commence par une espace, qui compte dans ses 75 octets.
    if (size + bytes > (chunks.length === 0 ? 75 : 74)) {
      chunks.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

export interface RenderCalendarInput {
  /** Nom du calendrier abonné. Absent pour un rendez-vous ajouté seul. */
  name?: string;
  timeZone: string | null | undefined;
  items: CalendarItem[];
  now: Date;
}

export function renderCalendar({ name, timeZone, items, now }: RenderCalendarInput): string {
  const toInstant = clubClock(timeZone);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nba//agenda//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (name) {
    lines.push(`X-WR-CALNAME:${escapeText(name)}`, `X-WR-TIMEZONE:${escapeText(timeZone || DEFAULT_TIMEZONE)}`);
    // Une indication : Google l'ignore, Apple et Outlook s'en servent.
    lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H');
  }

  const stamp = instantStamp(now.getTime());
  for (const item of items) {
    const when = bounds(item, toInstant);
    lines.push('BEGIN:VEVENT', `UID:${escapeText(item.uid)}`, `DTSTAMP:${stamp}`);
    if (when.allDay) lines.push(`DTSTART;VALUE=DATE:${when.start}`, `DTEND;VALUE=DATE:${when.end}`);
    else lines.push(`DTSTART:${when.start}`, `DTEND:${when.end}`);
    lines.push(`SUMMARY:${escapeText(item.title)}`);
    if (item.location) lines.push(`LOCATION:${escapeText(item.location)}`);
    if (item.description) lines.push(`DESCRIPTION:${escapeText(item.description)}`);
    if (item.url) lines.push(`URL:${item.url}`);
    lines.push(`STATUS:${item.cancelled ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** Le formulaire « nouvel événement » de Google Agenda, prérempli. */
export function googleCalendarUrl(item: CalendarItem, timeZone: string | null | undefined): string {
  const when = bounds(item, clubClock(timeZone));
  const params = new URLSearchParams({ action: 'TEMPLATE', text: item.title, dates: `${when.start}/${when.end}` });
  const details = [item.description, item.url].filter(Boolean).join('\n');
  if (details) params.set('details', details);
  if (item.location) params.set('location', item.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
