import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import OpenPlaySignup from './OpenPlaySignup.svelte';

/**
 * L'îlot d'inscription, et surtout la saisie des invités.
 *
 * Ces tests n'auraient jamais tourné avant ce lot : le domaine des créneaux n'avait pas
 * de projet vitest `-ui`, et `exclude: ['**​/ui/**']` du projet API les écartait sans que
 * rien ne les reprenne.
 */

/**
 * Le formulaire vit dans un tiroir, porté hors du conteneur de montage : tout ce qui
 * s'y trouve se cherche dans `document.body`. La ligne, elle, ne porte qu'un bouton.
 */
function ouvrir(host: HTMLElement): HTMLElement {
  const declencheur = [...host.querySelectorAll('button')].find((b) =>
    /Je viens|Gérer mon inscription/.test(b.textContent ?? '')
  );
  if (!declencheur) throw new Error("aucun bouton n'ouvre l'inscription");
  declencheur.click();
  flushSync();
  return document.body;
}

function clickByText(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`bouton « ${text} » introuvable`);
  button.click();
  flushSync();
}

function fill(host: HTMLElement, label: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`);
  if (!input) throw new Error(`champ « ${label} » introuvable`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

describe('OpenPlaySignup', () => {
  let host: HTMLElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    // `window.location.reload` n'existe pas sous jsdom : l'îlot recharge après écriture.
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
  });

  afterEach(() => {
    host.remove();
    // Les portails du design system sortent du conteneur.
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(OpenPlaySignup, {
      target: host,
      props: { sessionId: 7, minPlayers: 4, ...props }
    });
    flushSync();
  }

  it('propose de venir quand on n’est pas inscrit', () => {
    render({ myGuests: null });
    expect(host.textContent).toContain('Je viens');
    expect(host.textContent).not.toContain('Je ne viens plus');
  });

  it('propose de se retirer et de mettre à jour quand on l’est', () => {
    // `[]` veut dire « inscrit et je viens seul », `null` « pas inscrit » : c'est cette
    // différence qui décide du libellé.
    render({ myGuests: [] });
    expect(host.textContent).toContain('Gérer mon inscription');
    const feuille = ouvrir(host);
    expect(feuille.textContent).toContain('Je ne viens plus');
    expect(feuille.textContent).toContain('Mettre à jour');
  });

  it('préremplit les invités déjà annoncés', () => {
    render({ myGuests: [{ firstName: 'Léa', lastName: 'Martin' }] });
    const feuille = ouvrir(host);
    const first = feuille.querySelector<HTMLInputElement>('[aria-label="Prénom de l\'invité 1"]');
    expect(first?.value).toBe('Léa');
  });

  it('ajoute puis retire une ligne d’invité', () => {
    render({ myGuests: [] });
    const feuille = ouvrir(host);
    expect(feuille.querySelector('[aria-label="Prénom de l\'invité 1"]')).toBeNull();

    clickByText(feuille, 'Inviter quelqu’un'.replace('’', "'"));
    expect(feuille.querySelector('[aria-label="Prénom de l\'invité 1"]')).not.toBeNull();

    const remove = feuille.querySelector<HTMLButtonElement>('[aria-label="Retirer l\'invité 1"]')!;
    remove.click();
    flushSync();
    expect(feuille.querySelector('[aria-label="Prénom de l\'invité 1"]')).toBeNull();
  });

  it('cesse de proposer une ligne au-delà de trois invités', () => {
    render({
      myGuests: [
        { firstName: 'Léa', lastName: 'Martin' },
        { firstName: 'Paul', lastName: 'Martin' },
        { firstName: 'Anne', lastName: 'Martin' }
      ]
    });
    // L'écran ne doit jamais proposer une valeur que l'API refuserait.
    const feuille = ouvrir(host);
    const invite = [...feuille.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Inviter')
    );
    expect(invite).toBeUndefined();
  });

  it('refuse d’envoyer un invité sans nom, avec la phrase du serveur', () => {
    render({ myGuests: [] });
    const feuille = ouvrir(host);
    clickByText(feuille, 'Inviter');
    fill(feuille, "Prénom de l'invité 1", 'Léa');

    clickByText(feuille, 'Mettre à jour');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(feuille.textContent).toContain('Renseignez le prénom et le nom de chaque invité');
  });

  it('poste exactement les invités saisis, élagués', async () => {
    render({ myGuests: [] });
    const feuille = ouvrir(host);
    clickByText(feuille, 'Inviter');
    fill(feuille, "Prénom de l'invité 1", '  Léa ');
    fill(feuille, "Nom de l'invité 1", ' Martin  ');

    clickByText(feuille, 'Mettre à jour');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      action: 'register',
      sessionId: 7,
      guests: [{ firstName: 'Léa', lastName: 'Martin' }]
    });
  });

  it('n’offre rien quand la séance est close', () => {
    render({ myGuests: null, open: false });
    expect(host.querySelector('button')).toBeNull();
    expect(host.textContent).toContain('Les inscriptions sont closes');
  });

  it('dit combien de joueurs manquent au seuil', () => {
    render({ myGuests: [], playerCount: 2, minPlayers: 4 });
    expect(host.textContent).toContain('2 joueurs attendus');
    expect(host.textContent).toContain('il en faut 4 pour ouvrir');
  });
});
