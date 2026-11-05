import { describe, it, expect } from 'vitest';
import { clubClock, googleCalendarUrl, renderCalendar, type CalendarItem } from './calendar-ics';

const NOW = new Date('2026-08-30T12:00:00Z');

const item = (over: Partial<CalendarItem> = {}): CalendarItem => ({
  uid: 'event-1@club',
  title: 'Tournoi',
  start: '2026-11-14T09:00',
  end: '2026-11-14T18:00',
  allDay: false,
  location: null,
  description: null,
  url: null,
  cancelled: false,
  ...over
});

const render = (over: Partial<CalendarItem> = {}, timeZone = 'Europe/Paris') =>
  renderCalendar({ timeZone, items: [item(over)], now: NOW });

/** Une ligne de contenu, une fois dépliée. */
const unfolded = (ics: string) => ics.replace(/\r\n /g, '');

describe('fuseau du club', () => {
  it("convertit l'heure d'hiver de Paris (UTC+1)", () => {
    expect(render()).toContain('DTSTART:20261114T080000Z');
    expect(render()).toContain('DTEND:20261114T170000Z');
  });

  it("convertit l'heure d'été de Paris (UTC+2)", () => {
    expect(render({ start: '2026-06-20T19:00', end: '2026-06-20T22:00' })).toContain('DTSTART:20260620T170000Z');
  });

  it("tient les deux côtés d'un changement d'heure", () => {
    // Bascule d'hiver le 25 octobre 2026 à 3 h : la veille UTC+2, le lendemain UTC+1.
    expect(render({ start: '2026-10-24T20:00', end: null })).toContain('DTSTART:20261024T180000Z');
    expect(render({ start: '2026-10-25T20:00', end: null })).toContain('DTSTART:20261025T190000Z');
    // Fin qui franchit la bascule de printemps : chaque borne prend son propre décalage.
    const night = render({ start: '2026-03-29T01:00', end: '2026-03-29T04:00' });
    expect(night).toContain('DTSTART:20260329T000000Z');
    expect(night).toContain('DTEND:20260329T020000Z');
  });

  it("suit le fuseau réglé par le club, pas celui de la métropole", () => {
    expect(render({}, 'Indian/Reunion')).toContain('DTSTART:20261114T050000Z');
    expect(render({}, 'America/Martinique')).toContain('DTSTART:20261114T130000Z');
  });

  it('retombe sur la métropole devant un fuseau illisible', () => {
    expect(render({}, 'Mars/Olympus')).toContain('DTSTART:20261114T080000Z');
    expect(clubClock(null)(Date.UTC(2026, 10, 14, 9))).toBe(Date.UTC(2026, 10, 14, 8));
  });

  it('annonce le fuseau du club au calendrier abonné', () => {
    const ics = renderCalendar({ name: 'Club – Léo', timeZone: 'Europe/Paris', items: [], now: NOW });
    expect(ics).toContain('X-WR-TIMEZONE:Europe/Paris');
    expect(ics).toContain('X-WR-CALNAME:Club – Léo');
  });
});

describe('journées entières', () => {
  it('ne convertit pas une date sans heure, et termine le lendemain', () => {
    const ics = render({ start: '2026-11-15', end: null, allDay: true }, 'Pacific/Auckland');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261115');
    expect(ics).toContain('DTEND;VALUE=DATE:20261116');
  });

  it('inclut le dernier jour d’un événement sur plusieurs jours', () => {
    const ics = render({ start: '2026-11-14T00:00', end: '2026-11-15T00:00', allDay: true });
    expect(ics).toContain('DTEND;VALUE=DATE:20261116');
  });

  it("passe d'un mois à l'autre", () => {
    expect(render({ start: '2026-12-31', end: null, allDay: true })).toContain('DTEND;VALUE=DATE:20270101');
  });
});

describe('format', () => {
  it('donne deux heures à un rendez-vous sans fin connue', () => {
    expect(render({ end: null })).toContain('DTEND:20261114T100000Z');
  });

  it('sépare les lignes par CRLF', () => {
    expect(render().split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true);
  });

  it('échappe le texte libre', () => {
    const ics = unfolded(render({ title: 'A, B; C\\D', description: 'ligne 1\nligne 2' }));
    expect(ics).toContain('SUMMARY:A\\, B\\; C\\\\D');
    expect(ics).toContain('DESCRIPTION:ligne 1\\nligne 2');
  });

  it('replie à 75 octets sans couper un caractère', () => {
    const title = 'é'.repeat(100);
    const ics = render({ title });
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfolded(ics)).toContain(`SUMMARY:${title}`);
  });

  it('une séance annulée est annoncée comme telle', () => {
    expect(render({ cancelled: true })).toContain('STATUS:CANCELLED');
    expect(render()).toContain('STATUS:CONFIRMED');
  });

  it('un rendez-vous seul ne se présente pas comme un calendrier abonné', () => {
    expect(render()).not.toContain('X-WR-CALNAME');
  });
});

describe('lien Google Agenda', () => {
  it('reprend les instants UTC, le lieu et la description', () => {
    const url = new URL(googleCalendarUrl(item({ location: 'Gymnase', description: 'Détails' }), 'Europe/Paris'));
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261114T080000Z/20261114T170000Z');
    expect(url.searchParams.get('location')).toBe('Gymnase');
    expect(url.searchParams.get('details')).toBe('Détails');
  });

  it('garde une journée entière en dates', () => {
    const url = new URL(googleCalendarUrl(item({ start: '2026-11-15', end: null, allDay: true }), 'Europe/Paris'));
    expect(url.searchParams.get('dates')).toBe('20261115/20261116');
  });
});
