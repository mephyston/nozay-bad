import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import CalendarSubscribe from './CalendarSubscribe.svelte';

const LINKS = {
  feed: 'https://espace.example/calendrier/jeton.ics',
  webcal: 'webcal://espace.example/calendrier/jeton.ics',
  google: 'https://calendar.google.com/calendar/render?cid=x'
};

const answers: Record<string, unknown> = {};
const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  return new Response(JSON.stringify(answers[init?.method ?? 'GET']), { status: 200 });
});

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
};
const byId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function openSheet() {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(CalendarSubscribe, { target, props: { firstName: 'Léo' } });
  flushSync();
  byId('calendar-subscribe')!.click();
  await settle();
  return app;
}

describe("abonnement à l'agenda", () => {
  let app: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    answers.GET = { ok: true, subscribed: false };
    answers.POST = { ok: true, links: LINKS };
    answers.DELETE = { ok: true };
  });

  afterEach(() => {
    if (app) unmount(app);
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it("ne lit rien avant l'ouverture", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CalendarSubscribe, { target, props: { firstName: 'Léo' } });
    flushSync();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("nomme le bouton, qui n'affiche qu'une icône", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CalendarSubscribe, { target, props: { firstName: 'Léo' } });
    flushSync();
    expect(byId('calendar-subscribe')?.getAttribute('aria-label')).toBe("S'abonner depuis mon agenda");
  });

  it("crée l'adresse et propose chaque application", async () => {
    app = await openSheet();
    byId('calendar-create')!.click();
    await settle();

    expect(fetchMock).toHaveBeenCalledWith('/api/agenda/abonnement', expect.objectContaining({ method: 'POST' }));
    expect(byId('calendar-address')?.textContent).toBe(LINKS.feed);
    const hrefs = Array.from(document.body.querySelectorAll('[data-testid="calendar-sheet"] a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([LINKS.google, LINKS.webcal]);
    expect(document.body.textContent).toContain('une fois leur date fixée par le capitaine');
  });

  describe('sur Android', () => {
    beforeEach(() => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36');
    });
    afterEach(() => vi.restoreAllMocks());

    it("passe par le site de Google en version ordinateur, et dit d'activer la synchronisation", async () => {
      app = await openSheet();
      byId('calendar-create')!.click();
      await settle();

      expect(byId('calendar-android-steps')?.textContent).toContain('Synchroniser');
      const google = byId('calendar-android-google')!.getAttribute('href')!;
      expect(google).toMatch(/^intent:\/\/calendar\.google\.com\/calendar\/u\/0\/r\/settings\/addbyurl#Intent;scheme=https;package=com\.android\.chrome;/);
      // Ni le lien ?cid= que l'application avale, ni webcal:// qui n'ouvre rien.
      const hrefs = Array.from(document.body.querySelectorAll('[data-testid="calendar-sheet"] a')).map((a) => a.getAttribute('href')!);
      expect(hrefs).not.toContain(LINKS.google);
      expect(hrefs).not.toContain(LINKS.webcal);
      const mail = new URL(byId('calendar-mail')!.getAttribute('href')!);
      expect(decodeURIComponent(mail.search)).toContain(LINKS.feed);
    });
  });

  it("propose aussi l'adresse commune de toutes les rencontres, quand le club en a", async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CalendarSubscribe, { target, props: { firstName: 'Léo', clubFeedUrl: 'https://espace.example/calendrier/rencontres-du-club.ics' } });
    flushSync();
    byId('calendar-subscribe')!.click();
    await settle();
    const hrefs = Array.from(byId('calendar-club-feed')!.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('webcal://espace.example/calendrier/rencontres-du-club.ics');
  });

  it("sans équipes au club, pas d'adresse commune", async () => {
    app = await openSheet();
    expect(byId('calendar-club-feed')).toBeNull();
  });

  it("s'éclaire jusqu'à sa première ouverture sur l'appareil", async () => {
    localStorage.clear();
    localStorage.setItem('nba:account-hint:v1', '1');
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CalendarSubscribe, { target, props: { firstName: 'Léo' } });
    flushSync();
    expect(byId('calendar-subscribe')!.className).toContain('ring-primary');
    expect(byId('calendar-subscribe-hint')?.textContent).toContain('Votre agenda, dans votre téléphone');
    byId('calendar-subscribe')!.click();
    await settle();
    expect(byId('calendar-subscribe')!.className).not.toContain('ring-primary');
    expect(localStorage.getItem('nba:calendar-feed-hint:v1')).toBe('1');
    expect(byId('calendar-subscribe-hint')).toBeNull();
  });

  it("n'écrase une adresse existante qu'après confirmation", async () => {
    answers.GET = { ok: true, subscribed: true };
    app = await openSheet();
    expect(byId('calendar-create')).toBeNull();

    byId('calendar-replace')!.click();
    flushSync();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    byId('calendar-confirm-replace')!.click();
    await settle();
    expect(byId('calendar-address')?.textContent).toBe(LINKS.feed);
  });

  it("arrête l'abonnement après confirmation", async () => {
    answers.GET = { ok: true, subscribed: true };
    app = await openSheet();
    byId('calendar-stop')!.click();
    flushSync();
    byId('calendar-confirm-stop')!.click();
    await settle();

    expect(fetchMock).toHaveBeenCalledWith('/api/agenda/abonnement', expect.objectContaining({ method: 'DELETE' }));
    expect(byId('calendar-create')).not.toBeNull();
  });

  it('dit quand ça échoue', async () => {
    answers.GET = { ok: false, error: 'Abonnement indisponible.' };
    app = await openSheet();
    expect(document.body.textContent).toContain('Abonnement indisponible.');
  });
});
