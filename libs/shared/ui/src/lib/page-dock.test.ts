import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Ce que ce module doit garantir, et que rien ne garantissait avant lui.
 *
 * La première conception portait l'état dans une instance de module, en pariant
 * sur le regroupement des chunks. Le pari a tenu jusqu'à ce qu'un écran de plus
 * fasse dupliquer le module : `declarerActions` s'est retrouvé défini quatre fois
 * dans le bundle, l'écran parlant à une copie et la barre du bas à une autre — les
 * actions n'arrivaient jamais, et aucun test ne pouvait le voir, la duplication
 * n'existant qu'à la construction.
 *
 * `vi.resetModules()` rejoue exactement cette situation : deux évaluations du même
 * module, comme deux copies dans deux chunks.
 */
beforeEach(() => {
  const hote = globalThis as unknown as Record<symbol, unknown>;
  delete hote[Symbol.for('nba:dock-de-page')];
  vi.resetModules();
});

const action = (id: string) => ({ id, libelle: id, icone: null, run: () => {} });

describe('dockDePage', () => {
  it('partage son état entre deux copies du module', async () => {
    const { dockDePage: copieEcran } = await import('./page-dock.svelte');
    copieEcran.declarerActions([action('import')]);

    vi.resetModules();
    const { dockDePage: copieBarre } = await import('./page-dock.svelte');

    expect(copieBarre.lire().actions.map((a) => a.id)).toEqual(['import']);
  });

  it('prévient les abonnés d’une autre copie', async () => {
    const { dockDePage: copieBarre } = await import('./page-dock.svelte');
    const vu: number[] = [];
    copieBarre.sAbonner(() => vu.push(copieBarre.lire().actions.length));

    vi.resetModules();
    const { dockDePage: copieEcran } = await import('./page-dock.svelte');
    copieEcran.declarerActions([action('import'), action('export')]);

    expect(vu).toEqual([2]);
  });

  it('ne retire que sa propre déclaration', async () => {
    const { dockDePage } = await import('./page-dock.svelte');
    const retirerPremier = dockDePage.declarerActions([action('a')]);
    dockDePage.declarerActions([action('b')]);

    // L'écran qui part se démonte après que le suivant a déclaré : son retrait ne
    // doit pas effacer ce qui vient d'être posé.
    retirerPremier();

    expect(dockDePage.lire().actions.map((a) => a.id)).toEqual(['b']);
  });

  it('porte les filtres avec la recherche, et les retire avec elle', async () => {
    const { dockDePage } = await import('./page-dock.svelte');
    const retirer = dockDePage.declarerRecherche({
      placeholder: 'Rechercher',
      valeur: 'mar',
      onSubmit: () => {},
      filtres: { actif: true, ouvrir: () => {} },
    });

    expect(dockDePage.lire().recherche?.filtres?.actif).toBe(true);
    retirer();
    expect(dockDePage.lire().recherche).toBeNull();
  });
});
