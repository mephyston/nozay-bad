import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import BlockCard from './BlockCard.svelte';
import { BLOCK_KINDS } from './block-editor-registry';
import { deepState } from './blocks/reactive.svelte';
import type { BlockPayload } from '../../../shared/blocks';

/**
 * Le chemin réel : `PageEditor` crée un bloc depuis le catalogue et le confie à une
 * `BlockCard`, qui choisit l'éditeur. Tester l'éditeur seul laisse deux marches sans
 * garde-fou — le catalogue peut fabriquer une charge utile que l'éditeur ne sait pas
 * lire, et la carte peut ne pas router le type vers son composant.
 */
function render(type: BlockPayload['type']) {
  const kind = BLOCK_KINDS.find((k) => k.type === type);
  if (!kind) throw new Error(`type absent du catalogue : ${type}`);

  const block = deepState(kind.create());
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(BlockCard, {
    target,
    props: {
      block,
      index: 0,
      total: 1,
      onMove: () => {},
      onRemove: () => {},
      // Comme la vraie page : des cibles existent, donc le champ d'adresse d'un
      // bouton est rendu par `Combobox` et non par `Input`. C'est cet écart qui
      // avait masqué la panne.
      media: [],
      targets: [{ path: '/creneaux/', title: 'Créneaux', kind: 'page' as const }]
    }
  });
  flushSync();
  return { target, block };
}

const buttonLabelled = (target: HTMLElement, label: string) =>
  [...target.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

describe('BlockCard — carrousel', () => {
  it("monte l'éditeur du carrousel pour un bloc neuf du catalogue", () => {
    const { target } = render('carousel');
    expect(buttonLabelled(target, 'Ajouter une diapositive')).toBeDefined();
  });

  it('ajoute une diapositive au clic', () => {
    const { target, block } = render('carousel');

    buttonLabelled(target, 'Ajouter une diapositive')!.click();
    flushSync();

    expect(block).toMatchObject({ type: 'carousel', slides: [{ mediaId: 0, title: '' }] });
    const rows = [...target.querySelectorAll('span')].filter((s) =>
      /^Diapositive \d+$/.test(s.textContent?.trim() ?? '')
    );
    expect(rows).toHaveLength(1);
  });
});
