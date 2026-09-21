/**
 * Maintien long sur une ligne de liste, pour ouvrir son menu d'actions.
 *
 * Comme le balayage, l'action se pose une fois sur la liste. Elle n'ouvre aucun
 * menu à elle : elle déclenche celui que la ligne porte déjà, ce qui garantit que
 * le doigt, le clavier et le lecteur d'écran donnent exactement les mêmes actions.
 *
 * Réserve assumée : intercepter ce geste demande de neutraliser la sélection de
 * texte sur la ligne. Or une ligne porte souvent une référence qu'on recopie — un
 * numéro de licence, un numéro de pièce. D'où l'abandon du geste lorsqu'il démarre
 * dans une zone marquée `data-selectable`, qui reste sélectionnable.
 */

export type LongPressOptions = {
  /** Durée du maintien, en millisecondes. */
  delay?: number;
  /** Déplacement au-delà duquel le geste est un défilement, en pixels. */
  tolerance?: number;
  enabled?: boolean;
};

export function longPress(node: HTMLElement, options: LongPressOptions = {}) {
  let opts = { delay: 500, tolerance: 10, enabled: true, ...options };

  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let departX = 0;
  let departY = 0;
  let declenche = false;
  let pointeur: number | null = null;

  function annuler() {
    clearTimeout(minuteur);
    minuteur = undefined;
    pointeur = null;
  }

  function onPointerDown(e: PointerEvent) {
    // Souris exclue : au clic droit, c'est le menu contextuel du navigateur qui
    // fait foi, et un maintien de souris n'est pas un geste attendu.
    if (!opts.enabled || e.pointerType === 'mouse' || !e.isPrimary) return;

    const cible = e.target as Element | null;
    if (!cible || cible.closest('[data-no-swipe]') || cible.closest('[data-selectable]')) return;

    const ligne = cible.closest<HTMLElement>('[data-list-row][data-context-menu]');
    if (!ligne || ligne.hasAttribute('data-swipe-open')) return;

    departX = e.clientX;
    departY = e.clientY;
    declenche = false;
    pointeur = e.pointerId;

    minuteur = setTimeout(() => {
      declenche = true;
      pointeur = null;
      // Le menu de la ligne, et pas un autre : une seule déclaration d'actions.
      ligne.querySelector<HTMLElement>('[data-row-menu]')?.click();
    }, opts.delay);
  }

  function onPointerMove(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    if (Math.abs(e.clientX - departX) > opts.tolerance || Math.abs(e.clientY - departY) > opts.tolerance) {
      annuler();
    }
  }

  /** Le relâché qui suit l'ouverture ne doit pas naviguer vers la fiche. */
  function onClickCapture(e: MouseEvent) {
    if (!declenche) return;
    declenche = false;
    e.preventDefault();
    e.stopPropagation();
  }

  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', annuler, { passive: true });
  node.addEventListener('pointercancel', annuler, { passive: true });
  node.addEventListener('scroll', annuler, { passive: true, capture: true });
  node.addEventListener('click', onClickCapture, true);

  return {
    update(o: LongPressOptions = {}) {
      opts = { delay: 500, tolerance: 10, enabled: true, ...o };
    },
    destroy() {
      annuler();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', annuler);
      node.removeEventListener('pointercancel', annuler);
      node.removeEventListener('scroll', annuler, true);
      node.removeEventListener('click', onClickCapture, true);
    },
  };
}
