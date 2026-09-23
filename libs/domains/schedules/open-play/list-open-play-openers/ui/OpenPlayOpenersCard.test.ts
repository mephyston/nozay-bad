import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { dockDePage } from '@nba/ui';
import OpenPlayOpenersCard from './OpenPlayOpenersCard.svelte';

const MEMBERS = [
  { licence: '00000009', firstName: 'Marie', lastName: 'Dupuis' },
  { licence: '00000010', firstName: 'Pierre', lastName: 'Leroy' }
];

describe('OpenPlayOpenersCard', () => {
  let host: HTMLElement;
  /*
    La barre du bas est un singleton de module : un composant qui n'est jamais démonté
    y laisse ses actions déclarées, et le test suivant les y retrouve. On démonte donc,
    comme le fait une navigation douce dans l'application.
  */
  let monte: Record<string, unknown> | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    if (monte) unmount(monte);
    monte = null;
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    monte = mount(OpenPlayOpenersCard, {
      target: host,
      props: {
        openers: [{ id: 1, licence: '00000009', sessionsOpened: 2, name: 'Marie Dupuis' }],
        members: MEMBERS,
        seasonCode: '25-26',
        canWrite: true,
        ...props
      }
    });
    flushSync();
  }

  /*
    Confier une clé a quitté le pied de la carte pour la barre du bas : le champ vivait
    sous une liste qui grandit à chaque saison, et ses propositions poussaient la page à
    chaque frappe. Les tests empruntent donc le chemin du doigt — l'action du dock ouvre
    le tiroir —, et cherchent le champ dans le document : une feuille est portée hors de
    l'îlot.
  */
  function ouvrirAttribution() {
    const action = dockDePage.lire().actions.find((a) => a.id === 'confier');
    expect(action, 'action « Confier une clé » absente de la barre du bas').toBeDefined();
    action!.run();
    flushSync();
  }

  function search(term: string) {
    const input = document.querySelector<HTMLInputElement>('[aria-label="Chercher un adhérent"]');
    expect(input, 'champ de recherche absent du tiroir').toBeTruthy();
    input!.value = term;
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  }

  it('affiche le nom résolu et le compte de séances ouvertes', () => {
    render();
    expect(host.textContent).toContain('Marie Dupuis');
    expect(host.textContent).toContain('2 séances ouvertes');
  });

  it('affiche une licence inconnue de l’annuaire plutôt que de la masquer', () => {
    // Un ouvreur qui n'a pas repris sa licence doit se voir : c'est l'information utile.
    render({ openers: [{ id: 1, licence: '00000099', sessionsOpened: 0, name: null }] });
    expect(host.textContent).toContain('Licence 00000099');
    expect(host.textContent).toContain('licence inconnue');
  });

  it('alerte quand personne ne peut ouvrir', () => {
    render({ openers: [] });
    expect(host.textContent).toContain('aucune séance ne pourra être confirmée');
  });

  it('ne propose rien en deçà de trois lettres', () => {
    render();
    ouvrirAttribution();
    search('Pi');
    expect(document.body.textContent).toContain('Saisissez au moins 3 lettres');
  });

  it('propose un adhérent à partir de trois lettres', () => {
    render();
    ouvrirAttribution();
    search('Pie');
    expect(document.body.textContent).toContain('Pierre Leroy');
  });

  it('survit à une même licence répétée', () => {
    /*
     * `/members` rend une ligne par licence ET par saison : un adhérent de trois ans y
     * figure trois fois. Une liste keyée sur la licence explosait alors en
     * `each_key_duplicate` — et une erreur d'hydratation ne se voit pas : le champ reste
     * affiché, rendu côté serveur, mais plus rien ne réagit. C'est le test qui manquait.
     */
    render({
      members: [
        { licence: '07051876', firstName: 'David', lastName: 'PAGNACCO' },
        { licence: '07051876', firstName: 'David', lastName: 'PAGNACCO' }
      ]
    });
    ouvrirAttribution();
    search('PAGNACCO');

    expect(document.body.textContent).toContain('David PAGNACCO');
    // Une seule proposition, et surtout : l'îlot est toujours vivant.
    const suggestions = [...document.querySelectorAll('li')].filter((b) =>
      b.textContent?.includes('PAGNACCO')
    );
    expect(suggestions).toHaveLength(1);
  });

  it('ne propose pas quelqu’un qui a déjà une clé', () => {
    render();
    ouvrirAttribution();
    search('Marie');
    expect(document.body.textContent).toContain('Aucun adhérent ne correspond');
  });

  it('laisse confier une clé ailleurs que dans la barre du bas', () => {
    /*
      La barre du bas est `md:hidden` : une action qui n'y vivrait que disparaîtrait
      au-dessus de 768 px. En déplaçant le champ de recherche dans un tiroir, ce geste
      s'est retrouvé sans aucune porte sur ordinateur — constaté à l'écran, pas par les
      tests. Celui-ci vise le bouton rendu par le composant lui-même.
    */
    render();
    const bouton = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Confier une clé')
    );
    expect(bouton, 'aucun bouton « Confier une clé » hors de la barre du bas').toBeDefined();

    bouton!.click();
    flushSync();
    expect(document.querySelector('[aria-label="Chercher un adhérent"]')).toBeTruthy();
  });

  it('n’offre aucune écriture en lecture seule', () => {
    render({ canWrite: false });
    expect(dockDePage.lire().actions.find((a) => a.id === 'confier')).toBeUndefined();
    expect(document.querySelector('[aria-label="Chercher un adhérent"]')).toBeNull();
    expect(host.textContent).not.toContain('Reprendre');
  });
});
