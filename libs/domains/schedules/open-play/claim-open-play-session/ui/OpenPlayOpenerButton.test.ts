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

  /*
   * La rétractation demande confirmation — mais l'espace adhérent ne monte pas
   * `GlobalConfirm` : `uiConfirm` y rendait une promesse jamais résolue, et le bouton
   * ne faisait rien du tout. Ces trois tests tiennent le geste de bout en bout, ce que
   * ne faisait aucun test avant la correction.
   */
  function clickLabel(label: string) {
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label)
    );
    expect(button, `bouton « ${label} » absent`).toBeTruthy();
    button!.click();
    flushSync();
  }

  it('demande confirmation avant de rétracter, sans rien poster', () => {
    render({ openerName: 'Marie D.', iAmOpener: true });
    clickLabel('Je ne peux plus ouvrir');

    expect(host.textContent).toContain('Des adhérents comptent sur vous');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('poste la rétractation une fois confirmée', async () => {
    render({ openerName: 'Marie D.', iAmOpener: true });
    clickLabel('Je ne peux plus ouvrir');
    clickLabel('Je ne peux plus');

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ action: 'release', sessionId: 7 });
  });

  it('laisse la séance intacte si on renonce', () => {
    render({ openerName: 'Marie D.', iAmOpener: true });
    clickLabel('Je ne peux plus ouvrir');
    clickLabel('Annuler');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Je ne peux plus ouvrir');
  });
});
