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

const action = (id: string) => ({ id, label: id, icon: null, run: () => {} });

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

describe('plusieurs déclarations d’actions', () => {
  it('les cumule au lieu de les écraser', async () => {
    const { dockDePage } = await import('./page-dock.svelte');
    /*
      Un même écran en déclare depuis plusieurs composants : la liste pose ses
      créations, le sélecteur de saison pose la sienne. Tant que la déclaration
      écrasait, le dernier monté effaçait l'autre — et selon l'ordre de montage,
      c'était tantôt l'un, tantôt l'autre qui disparaissait.
    */
    const retirerA = dockDePage.declarerActions([{ id: 'a', label: 'A', run: () => {} }]);
    const retirerB = dockDePage.declarerActions([{ id: 'b', label: 'B', run: () => {} }]);

    expect(dockDePage.lire().actions.map((a) => a.id)).toEqual(['a', 'b']);

    retirerB();
    expect(dockDePage.lire().actions.map((a) => a.id)).toEqual(['a']);
    retirerA();
    expect(dockDePage.lire().actions).toEqual([]);
  });

  it('garde le groupe de la première déclaration qui en fournit un', async () => {
    const { dockDePage } = await import('./page-dock.svelte');
    // C'est l'écran qui se monte d'abord, donc celui dont le geste est principal : un
    // sélecteur de saison qui arrive ensuite ne renomme pas le bouton.
    const retirerA = dockDePage.declarerActions([{ id: 'a', label: 'A', run: () => {} }], {
      label: 'Nouvelle page'
    });
    const retirerB = dockDePage.declarerActions([{ id: 'b', label: 'B', run: () => {} }], {
      label: 'Saison'
    });

    expect(dockDePage.lire().groupe?.label).toBe('Nouvelle page');

    retirerA();
    expect(dockDePage.lire().groupe?.label).toBe('Saison');
    retirerB();
    expect(dockDePage.lire().groupe).toBeNull();
  });

  it('ne retire rien deux fois', async () => {
    const { dockDePage } = await import('./page-dock.svelte');
    // Un composant démonté deux fois — cela arrive à la navigation douce — ne doit pas
    // emporter la déclaration d'un voisin.
    const retirer = dockDePage.declarerActions([{ id: 'a', label: 'A', run: () => {} }]);
    const autre = dockDePage.declarerActions([{ id: 'b', label: 'B', run: () => {} }]);
    retirer();
    retirer();
    expect(dockDePage.lire().actions.map((a) => a.id)).toEqual(['b']);
    autre();
  });
});
