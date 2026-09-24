import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import OpenPlayAttendees from './OpenPlayAttendees.svelte';

const RESPONSE = {
  data: {
    attendees: [
      { firstName: 'Camille', lastName: 'Durand', guests: [] },
      {
        firstName: 'Marie',
        lastName: 'Dupuis',
        guests: [{ firstName: 'Léa', lastName: 'Martin' }]
      }
    ]
  }
};

describe('OpenPlayAttendees', () => {
  let host: HTMLElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    fetchMock = vi.fn(async () => new Response(JSON.stringify(RESPONSE), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(OpenPlayAttendees, { target: host, props: { sessionId: 7, playerCount: 3, ...props } });
    flushSync();
  }

  const button = () => host.querySelector('button');
  /* La liste vit dans une feuille, portée hors du conteneur de montage. */
  const feuille = () => document.body;

  it('ne propose rien quand personne n’est inscrit', () => {
    // Rien à voir, et surtout rien à demander : pas d'appel inutile par séance vide.
    render({ playerCount: 0 });
    expect(button()).toBeNull();
  });

  it('ne charge la liste qu’au clic', () => {
    render();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Voir qui vient');
  });

  it('affiche les inscrits et leurs invités', async () => {
    render();
    button()!.click();
    await vi.waitFor(() => expect(feuille().textContent).toContain('Camille Durand'));
    flushSync();

    expect(feuille().textContent).toContain('Marie Dupuis');
    expect(feuille().textContent).toContain('avec Léa Martin');
    // Le bouton n'a plus à changer de libellé : la feuille se ferme par sa croix.
    expect(host.textContent).toContain('Voir qui vient');
  });

  it('ne demande que l’identifiant de séance', async () => {
    render();
    button()!.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // L'îlot ignore l'identité : la page qui le porte détient la session.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      action: 'attendees',
      sessionId: 7
    });
  });

  it('relit la liste à chaque ouverture', async () => {
    render();
    button()!.click();
    // Attendre que la liste soit rendue, et pas seulement demandée : le bouton reste
    // désactivé tant que le chargement court.
    await vi.waitFor(() => expect(feuille().textContent).toContain('Camille Durand'));
    flushSync();

    button()!.click(); // referme
    flushSync();
    button()!.click(); // rouvre
    // Entre deux dépliages, quelqu'un a pu s'inscrire.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('le dit quand la liste est indisponible', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    render();
    button()!.click();
    await vi.waitFor(() => expect(feuille().textContent).toContain('Liste indisponible'));
  });
});
