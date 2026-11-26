// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  androidBrowserLink,
  calendarFeedUrl,
  calendarMailLink,
  calendarItemQuery,
  calendarLinks,
  generateCalendarToken,
  GOOGLE_ADD_BY_URL,
  hashCalendarToken,
  isAndroid,
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

describe('parcours Android', () => {
  it("ouvre la page d'ajout par adresse dans Chrome, et retombe sur l'adresse ordinaire sans lui", () => {
    const link = androidBrowserLink();
    expect(link.startsWith('intent://calendar.google.com/calendar/u/0/r/settings/addbyurl#Intent;scheme=https;package=com.android.chrome;')).toBe(true);
    expect(decodeURIComponent(/S\.browser_fallback_url=([^;]+)/.exec(link)![1])).toBe(GOOGLE_ADD_BY_URL);
  });

  it("met l'adresse et la marche à suivre dans le courriel", () => {
    const mail = calendarMailLink('https://espace.example/calendrier/jeton.ics', 'Léo');
    expect(mail.startsWith('mailto:?subject=')).toBe(true);
    const body = decodeURIComponent(mail.split('&body=')[1]);
    expect(body).toContain('https://espace.example/calendrier/jeton.ics');
    expect(body).toContain('Synchroniser');
  });

  it("reconnaît Android, et lui seul", () => {
    expect(isAndroid('Mozilla/5.0 (Linux; Android 15; SM-S921B) Chrome/131.0 Mobile')).toBe(true);
    expect(isAndroid('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')).toBe(false);
  });
});

describe("cible de l'ajout d'un rendez-vous", () => {
  it('désigne un événement, une séance ou une rencontre', () => {
    expect(calendarItemQuery({ kind: 'event', id: 12 })).toBe('kind=event&ref=12');
    expect(calendarItemQuery({ kind: 'open-play', id: 3 })).toBe('kind=open-play&ref=3');
    expect(calendarItemQuery({ kind: 'fixture', teamId: 2, dayNumber: 5 })).toBe('kind=fixture&ref=2-5');
  });
});
