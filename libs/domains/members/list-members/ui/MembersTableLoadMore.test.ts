import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import MembersTable from './MembersTable.svelte';
import type { Member } from './members-table-types';

/**
 * Le chargement par tranches, et la forme de la réponse qu'il attend.
 *
 * Le relais enveloppe ses réponses dans `{ success, data }`. La première version
 * lisait `members` à la racine : le tableau était `undefined`, un tableau vide
 * s'ajoutait, et la liste ne grandissait jamais — sans la moindre erreur. Ce test
 * fige l'enveloppe autant que le comportement.
 */
const adherent = (id: number): Member => ({
  id,
  licence: String(10000000 + id),
  lastName: `Nom${id}`,
  firstName: 'Test',
  gender: 'M',
  birthDate: '1990-01-01',
  status: 'valide',
  type: 'Loisir',
  paid: true,
});

function monter(totalPages: number) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(MembersTable, {
    target,
    props: {
      data: [adherent(1), adherent(2)],
      pagination: { total: 4, page: 1, limit: 2, totalPages },
      filters: { search: '', gender: '', status: '', type: '', season: '25-26' },
      seasons: [],
    },
  });
  return target;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('MembersTable — charger la suite', () => {
  it('ajoute la tranche suivante à la liste, depuis l’enveloppe du relais', async () => {
    const fetchSimule = vi.fn(async (_entree: RequestInfo | URL) =>
      new Response(JSON.stringify({ success: true, data: { members: [adherent(3), adherent(4)] } }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSimule);

    const target = monter(2);
    const bouton = [...target.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Afficher les')
    );
    expect(bouton, 'le bouton de chargement doit être rendu').toBeTruthy();

    bouton!.click();
    await vi.waitFor(() => expect(target.innerHTML).toContain('Nom3'));
    flushSync();

    expect(fetchSimule).toHaveBeenCalledTimes(1);
    const url = String(fetchSimule.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/admin/api/members/list');
    expect(url).toContain('page=2');
    expect(target.innerHTML).toContain('Nom4');
  });

  it('ne propose rien à charger quand tout tient sur une page', () => {
    const target = monter(1);
    const bouton = [...target.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Afficher les')
    );
    expect(bouton).toBeUndefined();
  });
});
