// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  calendarFeedUrl,
  calendarItemQuery,
  calendarLinks,
  generateCalendarToken,
  hashCalendarToken,
  isCalendarToken
} from './calendar-feed';

describe("adresse d'abonnement", () => {
  it('génère des jetons valables et tous différents', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateCalendarToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(isCalendarToken(token)).toBe(true);
  });

  it('refuse ce qui ne ressemble pas à un jeton', () => {
    for (const value of ['', 'court', '../../etc/passwd', 'a'.repeat(44), null, undefined]) {
      expect(isCalendarToken(value)).toBe(false);
    }
  });

  it("donne l'empreinte que l'API attend", async () => {
    expect(await hashCalendarToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('propose une adresse par application', () => {
    const url = calendarFeedUrl('https://espace.example/agenda?x=1', 'jeton');
    expect(url).toBe('https://espace.example/calendrier/jeton.ics');

    const links = calendarLinks(url);
    expect(links.webcal).toBe('webcal://espace.example/calendrier/jeton.ics');
    expect(new URL(links.google).searchParams.get('cid')).toBe('webcal://espace.example/calendrier/jeton.ics');
  });
});

describe("cible de l'ajout d'un rendez-vous", () => {
  it('désigne un événement, une séance ou une rencontre', () => {
    expect(calendarItemQuery({ kind: 'event', id: 12 })).toBe('kind=event&ref=12');
    expect(calendarItemQuery({ kind: 'open-play', id: 3 })).toBe('kind=open-play&ref=3');
    expect(calendarItemQuery({ kind: 'fixture', teamId: 2, dayNumber: 5 })).toBe('kind=fixture&ref=2-5');
  });
});
