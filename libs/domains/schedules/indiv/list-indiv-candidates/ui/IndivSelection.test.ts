import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import IndivSelection from './IndivSelection.svelte';

const SESSION = {
  id: 7, date: '2026-03-17', startTime: '19:30', endTime: '20:30', status: 'open' as const,
  slotCount: 2, capacityPerSlot: 2, label: null, venueName: 'Pierre Dupuis',
  slots: [
    { index: 1, startTime: '19:30', endTime: '20:00' },
    { index: 2, startTime: '20:00', endTime: '20:30' }
  ]
};

function candidate(requestId: number, over: Record<string, unknown> = {}) {
  return {
    requestId, memberId: requestId, licence: `0000000${requestId}`, firstName: `P${requestId}`, lastName: 'Nom',
    memberGroup: 'Compétiteurs adultes', preferredSlot: null, note: null, selectedSlot: null,
    requestedAt: requestId, requestCount: 1, selectedCount: 0, lastSelectedDate: null,
    birthDate: '1990-01-01', category: 'Senior', singles: 'D8', doubles: 'D9', mixed: null,
    ...over
  };
}

function clickByText(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text || b.textContent?.includes(text));
  if (!button) throw new Error(`bouton « ${text} » introuvable`);
  button.click();
  flushSync();
}

describe('IndivSelection', () => {
  let host: HTMLElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
  });

  afterEach(() => {
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(IndivSelection, { target: host, props: { session: SESSION, candidates: [], canWrite: true, ...props } });
    flushSync();
  }

  it('classe les candidats : moins retenus d’abord, puis plus jeunes', () => {
    render({
      candidates: [
        candidate(1, { selectedCount: 2, birthDate: '2010-01-01' }),
        candidate(2, { selectedCount: 0, birthDate: '1980-01-01' }),
        candidate(3, { selectedCount: 0, birthDate: '2008-01-01' })
      ]
    });
    const names = [...host.querySelectorAll('[data-testid="candidate"]')].map((li) => li.textContent?.match(/P\d/)?.[0]);
    expect(names).toEqual(['P3', 'P2', 'P1']);
    expect(host.textContent).toContain('18 ans');
    expect(host.textContent).toContain('S/D/M D8 / D9 / —');
  });

  it('« Proposer » remplit les créneaux dans l’ordre, en respectant les préférences', () => {
    render({ candidates: [candidate(1, { preferredSlot: 2 }), candidate(2), candidate(3), candidate(4), candidate(5)] });
    clickByText(host, 'Proposer');
    const pressed = [...host.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.textContent?.trim());
    // P1 sur le 2, P2 et P3 sur le 1, P4 sur le 2 ; P5 reste dehors.
    expect(pressed).toEqual(['2', '1', '1', '2']);
    expect(host.textContent).toContain('Créneau 1 · 19h30-20h00 · 2/2');
  });

  it('refuse une troisième personne sur un créneau plein', () => {
    render({ candidates: [candidate(1, { selectedSlot: 1 }), candidate(2, { selectedSlot: 1 }), candidate(3)] });
    const groups = host.querySelectorAll('[role="group"]');
    const third = groups[2].querySelectorAll('button')[1] as HTMLButtonElement;
    third.click();
    flushSync();
    expect(third.getAttribute('aria-pressed')).toBe('false');
  });

  it('enregistre la sélection entière auprès du relais', async () => {
    render({ candidates: [candidate(1), candidate(2)] });
    const group = host.querySelectorAll('[role="group"]')[0];
    (group.querySelectorAll('button')[2] as HTMLButtonElement).click();
    flushSync();
    clickByText(host, 'Enregistrer');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body).toEqual({ action: 'select', id: 7, selection: [{ requestId: 1, slot: 2 }] });
  });

  it('cache les actions d’écriture sans le droit, garde la copie', () => {
    render({ canWrite: false, candidates: [candidate(1)] });
    expect(host.textContent).not.toContain('Annoncer');
    expect(host.textContent).toContain("Copier l'annonce");
  });
});
