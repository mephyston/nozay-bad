/**
 * Balayage d'une ligne de liste — révélation des actions, puis exécution.
 *
 * L'action se pose **une fois sur la liste**, pas sur chaque ligne : quatre
 * écouteurs au lieu de deux cents pour cinquante lignes, et « refermer la ligne
 * ouverte quand une autre s'ouvre » devient une variable locale au lieu d'un
 * registre global.
 *
 * Le point important : on ne se bat pas contre le défilement, on le délègue. La
 * couche glissante porte `touch-action: pan-y`, donc le navigateur garde le
 * défilement vertical natif — inertie comprise — et ne nous livre que
 * l'horizontal. Aucun `preventDefault` n'est nécessaire pendant le geste.
 *
 * Rien n'est persisté : l'île étant démontée à chaque navigation, une liste
 * repart toujours toutes lignes fermées, et c'est le comportement voulu. Ne pas
 * ajouter de `sessionStorage` ici.
 */

export type SwipeActionsOptions = {
  /** Seuil d'engagement du verrou d'axe, en pixels. */
  axisLock?: number;
  /** Fraction de la largeur des actions au-delà de laquelle la ligne reste ouverte. */
  openRatio?: number;
  /** Fraction de la largeur de la LIGNE au-delà de laquelle l'action de tête s'exécute. */
  commitRatio?: number;
};

const MOUVEMENT_MINIMAL = 4;

export function swipeActions(node: HTMLElement, options: SwipeActionsOptions = {}) {
  let { axisLock = 8, openRatio = 0.4, commitRatio = 0.55 } = options;

  let ligneOuverte: HTMLElement | null = null;

  // État du geste en cours.
  let ligne: HTMLElement | null = null;
  let couche: HTMLElement | null = null;
  let largeurActions = 0;
  let departX = 0;
  let departY = 0;
  let departOffset = 0;
  let dx = 0;
  let axe: 'x' | 'y' | null = null;
  let pointeur: number | null = null;
  let bouge = false;
  let trame = 0;

  const coucheDe = (l: HTMLElement) => l.querySelector<HTMLElement>('[data-swipe-layer]');
  const pisteDe = (l: HTMLElement) => l.querySelector<HTMLElement>('[data-swipe-track]');

  function poser(l: HTMLElement, x: number) {
    const c = coucheDe(l);
    if (c) c.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function fermer(l: HTMLElement | null) {
    if (!l) return;
    poser(l, 0);
    l.removeAttribute('data-swipe-open');
    if (ligneOuverte === l) ligneOuverte = null;
  }

  function ouvrir(l: HTMLElement, largeur: number) {
    if (ligneOuverte && ligneOuverte !== l) fermer(ligneOuverte);
    poser(l, -largeur);
    l.setAttribute('data-swipe-open', '');
    ligneOuverte = l;
  }

  /**
   * Au-delà du seuil long, on exécute l'action de tête en cliquant son bouton —
   * plutôt qu'en rappelant une fonction passée en option. Le bouton reste ainsi
   * la seule déclaration de l'action, partagée avec la voie clavier.
   */
  function executerTete(l: HTMLElement) {
    const bouton = pisteDe(l)?.querySelector<HTMLButtonElement>('button');
    fermer(l);
    bouton?.click();
  }

  function terminer() {
    if (trame) cancelAnimationFrame(trame);
    trame = 0;
    if (pointeur !== null && node.hasPointerCapture(pointeur)) node.releasePointerCapture(pointeur);
    pointeur = null;
    ligne = null;
    couche = null;
    axe = null;
    node.removeAttribute('data-swiping');
  }

  function onPointerDown(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0) return;

    const cible = e.target as Element | null;
    if (!cible) return;

    // Les boutons révélés et les contrôles embarqués gardent leurs propres gestes.
    if (cible.closest('[data-no-swipe]')) return;

    const l = cible.closest<HTMLElement>('[data-list-row]');

    // Un appui hors de la ligne ouverte la referme — y compris sur une autre ligne.
    if (ligneOuverte && ligneOuverte !== l) fermer(ligneOuverte);

    /*
      Un nouveau geste commence : le doigt n'a pas encore bougé.

      Remis à zéro **avant** la sortie qui suit, et non après. Une rangée sans action
      n'a pas de piste, `pisteDe` rend `null`, et l'on sortait sans toucher au drapeau :
      celui d'un geste précédent restait allumé, et le garde-fou du clic annulait alors
      tous les appuis sur ces rangées-là — définitivement, puisque seul un appui sur une
      rangée *avec* actions le rabaissait. C'est ce qui rendait inertes les réglages du
      hub de configuration, qui n'ont pas d'action de balayage.
    */
    bouge = false;

    if (!l || !pisteDe(l)) return;

    ligne = l;
    couche = coucheDe(l);
    departX = e.clientX;
    departY = e.clientY;
    departOffset = l.hasAttribute('data-swipe-open') ? -mesurer(l) : 0;
    dx = 0;
    axe = null;
    pointeur = e.pointerId;
  }

  function mesurer(l: HTMLElement) {
    // Lue une fois par geste : une lecture par frame forcerait autant de reflows.
    return pisteDe(l)?.offsetWidth ?? 0;
  }

  function onPointerMove(e: PointerEvent) {
    if (!ligne || e.pointerId !== pointeur) return;

    const ecartX = e.clientX - departX;
    const ecartY = e.clientY - departY;

    if (axe === null) {
      if (Math.abs(ecartX) < axisLock && Math.abs(ecartY) < axisLock) return;
      // Geste vertical : c'est un défilement, on abandonne pour de bon.
      if (Math.abs(ecartX) <= Math.abs(ecartY)) {
        terminer();
        return;
      }
      axe = 'x';
      largeurActions = mesurer(ligne);
      node.setAttribute('data-swiping', '');
      if (pointeur !== null) node.setPointerCapture(pointeur);
    }

    if (Math.abs(ecartX) > MOUVEMENT_MINIMAL) bouge = true;

    let x = departOffset + ecartX;
    // Rappel élastique : au-delà des actions, et vers la droite, le doigt ne suit plus.
    if (x < -largeurActions) x = -largeurActions - (-largeurActions - x) * 0.35;
    if (x > 0) x = x * 0.35;
    dx = x;

    if (!trame) {
      trame = requestAnimationFrame(() => {
        trame = 0;
        if (ligne) poser(ligne, dx);
      });
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!ligne || e.pointerId !== pointeur) return;
    const l = ligne;
    const parcouru = Math.abs(dx);
    const engage = axe === 'x';
    terminer();
    if (!engage) return;

    if (parcouru > l.offsetWidth * commitRatio) executerTete(l);
    else if (parcouru > largeurActions * openRatio) ouvrir(l, largeurActions);
    else fermer(l);
  }

  function onPointerCancel() {
    const l = ligne;
    terminer();
    fermer(l);
  }

  function onDragStart(e: Event) {
    if (axe === 'x') e.preventDefault();
  }

  /**
   * La ligne est un lien : sans ceci, un balayage naviguerait vers la fiche, et
   * l'appui qui referme une ligne ouverte l'ouvrirait aussi.
   */
  function onClickCapture(e: MouseEvent) {
    const cible = e.target as Element | null;
    if (cible?.closest('[data-no-swipe]')) return;
    const l = cible?.closest<HTMLElement>('[data-list-row]') ?? null;
    if (bouge || (l && l.hasAttribute('data-swipe-open'))) {
      e.preventDefault();
      e.stopPropagation();
      bouge = false;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') fermer(ligneOuverte);
  }

  function onPointerDownAilleurs(e: PointerEvent) {
    if (!ligneOuverte) return;
    if (!node.contains(e.target as Node)) fermer(ligneOuverte);
  }

  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', onPointerUp, { passive: true });
  node.addEventListener('pointercancel', onPointerCancel, { passive: true });
  node.addEventListener('dragstart', onDragStart);
  node.addEventListener('click', onClickCapture, true);
  node.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointerDownAilleurs, { capture: true, passive: true });

  return {
    update(o: SwipeActionsOptions = {}) {
      ({ axisLock = 8, openRatio = 0.4, commitRatio = 0.55 } = o);
    },
    destroy() {
      terminer();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('click', onClickCapture, true);
      node.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDownAilleurs, { capture: true });
    },
  };
}
