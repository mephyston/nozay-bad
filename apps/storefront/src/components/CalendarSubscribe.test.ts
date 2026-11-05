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
