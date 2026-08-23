import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import OpenPlayOpenersCard from './OpenPlayOpenersCard.svelte';

const MEMBERS = [
  { licence: '00000009', firstName: 'Marie', lastName: 'Dupuis' },
  { licence: '00000010', firstName: 'Pierre', lastName: 'Leroy' }
];

describe('OpenPlayOpenersCard', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(OpenPlayOpenersCard, {
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

  function search(term: string) {
    const input = host.querySelector<HTMLInputElement>('[aria-label="Chercher un adhérent"]')!;
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
    search('Pi');
    expect(host.textContent).toContain('Saisissez au moins 3 lettres');
  });

  it('propose un adhérent à partir de trois lettres', () => {
    render();
    search('Pie');
    expect(host.textContent).toContain('Pierre Leroy');
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
    search('PAGNACCO');

    expect(host.textContent).toContain('David PAGNACCO');
    // Une seule proposition, et surtout : l'îlot est toujours vivant.
    const suggestions = [...host.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('PAGNACCO')
    );
    expect(suggestions).toHaveLength(1);
  });

  it('ne propose pas quelqu’un qui a déjà une clé', () => {
    render();
    search('Marie');
    expect(host.textContent).toContain('Aucun adhérent ne correspond');
  });

  it('n’offre aucune écriture en lecture seule', () => {
    render({ canWrite: false });
    expect(host.querySelector('[aria-label="Chercher un adhérent"]')).toBeNull();
    expect(host.textContent).not.toContain('Reprendre');
  });
});
