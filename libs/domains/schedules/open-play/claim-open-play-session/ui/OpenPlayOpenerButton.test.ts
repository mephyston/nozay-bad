import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import OpenPlayOpenerButton from './OpenPlayOpenerButton.svelte';

describe('OpenPlayOpenerButton', () => {
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
    mount(OpenPlayOpenerButton, { target: host, props: { sessionId: 7, ...props } });
    flushSync();
  }

  it('propose d’ouvrir quand la séance cherche preneur', () => {
    render({ openerName: null, iAmOpener: false });
    expect(host.textContent).toContain("J'ouvre ce créneau");
  });

  it('insiste quand le seuil est atteint', () => {
    render({ needsOpener: true });
    expect(host.textContent).toContain('Assez de joueurs, mais personne pour ouvrir');
  });

  it('nomme l’ouvreur en place, sans proposer de le remplacer', () => {
    render({ openerName: 'Marie D.', iAmOpener: false });
    expect(host.textContent).toContain('Marie D. ouvre cette séance');
    expect(host.querySelector('button')).toBeNull();
  });

  it('propose de se rétracter à celui qui la tient', () => {
    render({ openerName: 'Marie D.', iAmOpener: true });
    expect(host.textContent).toContain("C'est vous qui ouvrez cette séance");
    expect(host.textContent).toContain('Je ne peux plus ouvrir');
  });

  it('poste l’engagement sans confirmation', async () => {
    render({ openerName: null });
    host.querySelector('button')!.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    // La licence n'est PAS envoyée par l'îlot : c'est la page qui l'impose depuis la
    // session, et c'est ce qui rend le contrôle incontournable.
    expect(body).toEqual({ action: 'claim', sessionId: 7 });
  });
});
