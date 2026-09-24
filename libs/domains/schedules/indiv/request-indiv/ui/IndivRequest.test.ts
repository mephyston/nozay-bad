import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import IndivRequest from './IndivRequest.svelte';

const SLOTS = [
  { index: 1, startTime: '19:30', endTime: '20:00' },
  { index: 2, startTime: '20:00', endTime: '20:30' }
];

/**
 * Le formulaire vit dans un tiroir, porté hors du conteneur de montage : tout ce qui
 * s'y trouve se cherche dans `document.body`. La carte, elle, ne porte qu'un bouton.
 */
function ouvrir(host: HTMLElement): HTMLElement {
  const declencheur = [...host.querySelectorAll('button')].find((b) =>
    /Je candidate|Gérer ma candidature/.test(b.textContent ?? '')
  );
  if (!declencheur) throw new Error("aucun bouton n'ouvre la candidature");
  declencheur.click();
  flushSync();
  return document.body;
}

/**
 * Soumet le formulaire de la feuille.
 *
 * Un clic sur le bouton ne suffit pas : le pied vit **hors** du `<form>` et s'y
 * rattache par l'attribut `form`, une association que les navigateurs honorent mais que
 * jsdom ne relaie pas jusqu'à l'événement `submit`.
 */
function soumettre(racine: HTMLElement) {
  const form = racine.querySelector('form');
  if (!form) throw new Error('aucun formulaire dans la feuille');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  flushSync();
}

function clickByText(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`bouton « ${text} » introuvable`);
  button.click();
  flushSync();
}

describe('IndivRequest', () => {
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
    mount(IndivRequest, { target: host, props: { sessionId: 7, slots: SLOTS, ...props } });
    flushSync();
  }

  it('propose de candidater quand on n’a rien demandé', () => {
    render({ myRequest: null });
    expect(host.textContent).toContain('Je candidate');
    const feuille = ouvrir(host);
    expect(feuille.textContent).not.toContain('Me retirer');
    // Les créneaux sont proposés avec leurs heures.
    expect(feuille.textContent).toContain('1er créneau (19h30-20h00)');
  });

  it('propose de préciser ou de se retirer quand on a candidaté', () => {
    render({ myRequest: { preferredSlot: 2, note: 'le service', selectedSlot: null } });
    expect(host.textContent).toContain('Gérer ma candidature');
    const feuille = ouvrir(host);
    expect(feuille.textContent).toContain('Mettre à jour');
    expect(feuille.textContent).toContain('Me retirer');
    expect(feuille.querySelector<HTMLInputElement>('#indiv-note-7')?.value).toBe('le service');
  });

  it('poste la préférence et le mot à la page hôte, jamais l’identité', async () => {
    render({ myRequest: null, endpoint: '/agenda' });
    const feuille = ouvrir(host);
    soumettre(feuille);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/agenda');
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ action: 'request', indivId: 7, preferredSlot: null, note: null });
    expect(JSON.stringify(body)).not.toContain('memberId');
  });

  it('lit la réponse de l’entraîneur une fois la soirée annoncée', () => {
    render({ status: 'announced', myRequest: { preferredSlot: null, note: null, selectedSlot: 2 } });
    expect(host.textContent).toContain('retenu·e sur le créneau 2 (20h00-20h30)');
    expect(host.textContent).toContain('Je ne peux plus venir');
    expect(host.textContent).not.toContain('Je candidate');

    host.innerHTML = '';
    render({ status: 'announced', myRequest: { preferredSlot: null, note: null, selectedSlot: null } });
    expect(host.textContent).toContain('Pas cette fois');
  });

  it('informe au lieu d’agir quand la soirée est close', () => {
    render({ open: false, myRequest: null });
    expect(host.textContent).toContain('Les candidatures sont closes.');
    expect(host.querySelector('button')).toBeNull();
  });

  it('affiche le refus du serveur dans l’îlot', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'Les séances individuelles sont réservées aux groupes compétiteurs.' }), { status: 403 })
    );
    render({ myRequest: null });
    const feuille = ouvrir(host);
    soumettre(feuille);
    await vi.waitFor(() => expect(feuille.textContent).toContain('réservées aux groupes compétiteurs'));
  });
});
