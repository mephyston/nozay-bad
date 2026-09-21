import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import { dockDePage } from '@nba/ui';
import MembersTable from './MembersTable.svelte';

/**
 * Ce que l'écran met dans la barre du bas, **vérifié depuis l'écran** et non
 * depuis un jeu d'essai écrit à la main.
 *
 * C'est toute la leçon de ce défaut : la barre lisait `libelle` et `icone`, les
 * écrans déclaraient `label` et `icon`, et le menu rendait deux entrées vides. La
 * story, elle, employait le vocabulaire de la barre — elle ne pouvait donc rien
 * voir. `tsc` non plus : il ne lit pas les `.svelte`.
 *
 * Partir d'un écran réel est le seul moyen de confronter les deux vocabulaires.
 */
beforeEach(() => {
  const hote = globalThis as unknown as Record<symbol, unknown>;
  delete hote[Symbol.for('nba:dock-de-page')];
});

function monter(canExport: boolean) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(MembersTable, {
    target,
    props: {
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      filters: { search: '', gender: '', status: '', type: '', season: '25-26' },
      seasons: [],
      canExport,
    },
  });
  flushSync();
  return target;
}

describe('MembersTable — barre du bas', () => {
  it('déclare des actions que la barre saura afficher', () => {
    monter(true);
    const actions = dockDePage.lire().actions;

    expect(actions.map((a) => a.id)).toEqual(['import', 'export']);
    for (const action of actions) {
      expect(action.label, `l'action ${action.id} doit porter un intitulé`).toBeTruthy();
      expect(action.icon, `l'action ${action.id} doit porter une icône`).toBeTruthy();
      expect(typeof action.run).toBe('function');
    }
  });

  it('n’offre pas l’export sans le droit', () => {
    monter(false);
    expect(dockDePage.lire().actions.map((a) => a.id)).toEqual(['import']);
  });

  it('confie recherche et filtres à la loupe', () => {
    monter(true);
    const recherche = dockDePage.lire().recherche;
    expect(recherche?.placeholder).toContain('Rechercher');
    expect(recherche?.filtres?.ouvrir).toBeTypeOf('function');
  });
});
