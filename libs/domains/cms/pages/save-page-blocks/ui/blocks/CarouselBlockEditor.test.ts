import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import CarouselBlockEditor from './CarouselBlockEditor.svelte';
import { deepState } from './reactive.svelte';
import type { CarouselBlock } from '../../../../shared/blocks';

/**
 * Le bouton « Ajouter une diapositive » ne se contente pas d'allonger un tableau : il
 * fait apparaître une ligne entière de champs. Un test qui vérifierait seulement la
 * longueur du tableau passerait alors qu'aucune ligne n'apparaît à l'écran — c'est
 * exactement la panne qu'on a eue. D'où des assertions sur le DOM rendu.
 *
 * **`targets` n'est jamais vide ici**, et ce n'est pas décoratif : sans cible, le
 * formulaire rend un `Input` pour l'adresse du bouton ; avec, il rend un `Combobox`,
 * qui déclare une valeur de repli et refuse `bind:value={undefined}`. Toute la panne
 * tenait dans cet écart, et une première version de ce fichier l'a manquée en montant
 * le composant sans cible.
 */
const TARGETS = [
  { path: '/creneaux/', title: 'Créneaux', kind: 'page' as const },
  { path: '/actualites/tournoi/', title: 'Tournoi', kind: 'post' as const }
];

function render(initial: CarouselBlock) {
  // Comme `PageEditor` : le composant reçoit un proxy réactif, pas un littéral.
  const block = deepState(initial);
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(CarouselBlockEditor, { target, props: { block, media: [], targets: TARGETS } });
  flushSync();
  return { target, block };
}

const addButton = (target: HTMLElement) =>
  [...target.querySelectorAll('button')].find((b) => b.textContent?.includes('Ajouter une diapositive'));

const slideRows = (target: HTMLElement) =>
  [...target.querySelectorAll('span')].filter((s) => /^Diapositive \d+$/.test(s.textContent?.trim() ?? ''));

describe('CarouselBlockEditor', () => {
  it("affiche le bouton d'ajout sur un bloc neuf", () => {
    const { target } = render({ type: 'carousel', slides: [] });
    expect(addButton(target)).toBeDefined();
    expect(slideRows(target)).toHaveLength(0);
  });

  it('fait apparaître une diapositive au clic', () => {
    const { target, block } = render({ type: 'carousel', slides: [] });

    addButton(target)!.click();
    flushSync();

    expect(block.slides).toHaveLength(1);
    expect(slideRows(target)).toHaveLength(1);
  });

  it('en empile plusieurs', () => {
    const { target, block } = render({ type: 'carousel', slides: [] });

    for (let i = 0; i < 3; i++) {
      addButton(target)!.click();
      flushSync();
    }

    expect(block.slides).toHaveLength(3);
    expect(slideRows(target)).toHaveLength(3);
  });

  it("ouvre une diapositive enregistrée sans bouton", () => {
    // La normalisation retire `ctaLabel` et `ctaHref` quand il n'y a pas de bouton :
    // la diapositive revient donc de la base sans ces clés, et le champ d'adresse
    // doit malgré tout pouvoir s'y lier.
    const { target } = render({
      type: 'carousel',
      slides: [{ mediaId: 7, title: 'Badminton loisir', description: 'Sans compétition.' }]
    });

    expect(slideRows(target)).toHaveLength(1);
  });

  it('retire une diapositive', () => {
    const { target, block } = render({
      type: 'carousel',
      slides: [
        { mediaId: 1, title: 'A' },
        { mediaId: 2, title: 'B' }
      ]
    });

    const remove = [...target.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Retirer cette diapositive')
    );
    remove!.click();
    flushSync();

    expect(block.slides).toMatchObject([{ title: 'B' }]);
    expect(slideRows(target)).toHaveLength(1);
  });
});
