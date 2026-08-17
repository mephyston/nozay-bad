import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import ColumnsBlockEditor from './ColumnsBlockEditor.svelte';
import { deepState } from './reactive.svelte';
import type { ColumnsBlock } from '../../../../shared/blocks';

/**
 * Choisir « Actualités » dans une colonne ne se contente pas d'écrire une clé : le
 * formulaire du bloc doit apparaître à la place de l'éditeur de texte. Un test qui
 * n'observerait que la charge utile passerait alors que rien ne s'affiche — le
 * rédacteur, lui, verrait une colonne vide et sans réglage.
 *
 * Comme `PageEditor`, le composant reçoit un **proxy réactif** et non un littéral :
 * `bind:block` sur un objet nu aboutirait sans jamais redessiner.
 */
function render(initial: ColumnsBlock) {
  const block = deepState(initial);
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(ColumnsBlockEditor, {
    target,
    props: { block, media: [], targets: [], categories: [{ slug: 'club', name: 'Vie du club' }] }
  });
  flushSync();
  return { target, block };
}

const TWO_TEXTS: ColumnsBlock = {
  type: 'columns',
  items: [{ html: '<p>A</p>' }, { html: '<p>B</p>' }]
};

const selects = (target: HTMLElement) => [...target.querySelectorAll('select')];

const kindSelects = (target: HTMLElement) =>
  selects(target).filter((s) => s.id.includes('columns-kind'));

const ratioSelect = (target: HTMLElement) =>
  selects(target).find((s) => s.id.includes('columns-ratio'));

function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

describe('ColumnsBlockEditor', () => {
  it('propose un contenu par colonne', () => {
    const { target } = render(structuredClone(TWO_TEXTS));
    expect(kindSelects(target)).toHaveLength(2);
    const options = [...kindSelects(target)[0].options].map((o) => o.value);
    expect(options).toContain('text');
    expect(options).toContain('posts_feed');
    expect(options).toContain('events');
    // La liste blanche est fermée : une accroche n'a pas sa place dans une colonne.
    expect(options).not.toContain('hero');
    expect(options).not.toContain('columns');
  });

  it("remplace le texte d'une colonne par un bloc, et affiche son formulaire", () => {
    const { target, block } = render(structuredClone(TWO_TEXTS));

    choose(kindSelects(target)[0], 'posts_feed');

    expect(block.items[0]).toMatchObject({ block: { type: 'posts_feed', limit: 6 } });
    // Le formulaire du bloc imbriqué est bien monté : ses champs propres apparaissent.
    expect(target.querySelector('[id$="-feed-limit"]')).not.toBeNull();
    expect(target.querySelector('[id$="-feed-category"]')).not.toBeNull();
  });

  it('revient au texte, et rend de nouveau un éditeur de texte', () => {
    const { target, block } = render(structuredClone(TWO_TEXTS));

    choose(kindSelects(target)[0], 'events');
    expect(block.items[0]).toMatchObject({ block: { type: 'events' } });

    choose(kindSelects(target)[0], 'text');
    expect(block.items[0]).toEqual({ html: '<p></p>' });
    expect(target.querySelector('[id$="-events-limit"]')).toBeNull();
  });

  /*
    La forme demandée pour l'accueil : les actualités sur deux tiers, l'agenda sur le
    dernier tiers.
  */
  it('règle la largeur à deux colonnes', () => {
    const { target, block } = render(structuredClone(TWO_TEXTS));

    const ratio = ratioSelect(target);
    expect(ratio).toBeDefined();
    choose(ratio!, 'wide-first');

    expect(block.ratio).toBe('wide-first');
  });

  it("retire le réglage de largeur dès qu'une troisième colonne apparaît", () => {
    const { target, block } = render(structuredClone(TWO_TEXTS));
    choose(ratioSelect(target)!, 'wide-last');

    const add = [...target.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ajouter une colonne')
    );
    add!.click();
    flushSync();

    expect(block.items).toHaveLength(3);
    expect(block.ratio).toBeUndefined();
    expect(ratioSelect(target)).toBeUndefined();
  });

  it('donne des identifiants distincts à deux blocs de même type', () => {
    // Deux colonnes voisines portant le même bloc : des `id` écrits en dur s'y
    // répéteraient, et cliquer un intitulé donnerait le champ de l'autre colonne.
    const { target } = render(structuredClone(TWO_TEXTS));

    choose(kindSelects(target)[0], 'posts_feed');
    choose(kindSelects(target)[1], 'posts_feed');

    const limits = [...target.querySelectorAll('[id$="-feed-limit"]')].map((el) => el.id);
    expect(limits).toHaveLength(2);
    expect(new Set(limits).size).toBe(2);
  });
});
