/**
 * Réordonnancement d'une liste par glissement, à la poignée.
 *
 * Deux flèches « monter » / « descendre » déplacent d'un cran : remonter la
 * septième sous-entrée d'un menu en tête demande six gestes, et six allers-retours
 * au serveur. Le glissement fait le trajet d'un coup, et surtout **il montre le
 * résultat pendant qu'on le fait** — sur une liste dont l'objet même est l'ordre,
 * c'est la différence entre agir et deviner.
 *
 * Le glisser-déposer HTML5 n'est pas une option : il est réservé à la souris,
 * `dragstart` n'existe pas au doigt. On reprend donc la mécanique du balayage —
 * capture de pointeur, suivi en `translate3d`, trame coalescée — sur l'axe Y.
 *
 * **Deux façons de saisir une rangée.** À la souris comme au doigt, la poignée part
 * au premier mouvement. Au doigt, un **maintien** sur la rangée la soulève aussi —
 * c'est le geste des listes iOS, et celui qu'on essaie d'abord : sans lui, un doigt
 * posé sur la rangée ne faisait que sélectionner le texte, et le téléphone proposait
 * « Copier » au lieu de déplacer. Un glissement franc, lui, reste un défilement : la
 * rangée n'est saisie que si le doigt tient en place `MAINTIEN_MS`.
 *
 * Le déplacement est **borné à la fratrie** : seules les rangées portant le même
 * `data-reorder-group` s'écartent et se laissent dépasser. Un menu à deux niveaux
 * n'autorise pas à sortir une sous-entrée de son parent d'un glissement — ce
 * serait une autre opération, qui change le parent et non le rang.
 */

export type ReorderOptions = {
  /** Appelée au relâché, seulement si le rang a changé. */
  onReorder: (groupe: string, de: number, vers: number) => void;
};

/**
 * Où tombe la rangée traînée, d'après les milieux de ses voisines.
 *
 * Extraite et pure : c'est la seule arithmétique du geste, et la seule chose qui
 * puisse se tromper silencieusement — une rangée qui atterrit un cran trop haut ne
 * lève aucune erreur.
 *
 * `milieux` donne le centre de chaque rangée du groupe **dans sa position de
 * départ**, rang par rang.
 */
export function rangCible(centre: number, milieux: readonly number[], depart: number): number {
  let cible = depart;
  for (let i = 0; i < milieux.length; i += 1) {
    if (i === depart) continue;
    // En descendant, on dépasse une voisine dès qu'on franchit son milieu ; en
    // montant, c'est l'inverse. Comparer au milieu et non au bord évite le
    // tremblement quand deux rangées ont presque la même hauteur.
    if (i > depart && centre > milieux[i]) cible = i;
    if (i < depart && centre < milieux[i]) {
      cible = i;
      break;
    }
  }
  return cible;
}

const MOUVEMENT_MINIMAL = 3;

/**
 * Durée du maintien qui soulève une rangée, au doigt.
 *
 * Sous le demi-seconde où iOS ouvre sa loupe et sa sélection : c'est ce qui laisse le
 * geste à la liste. Au-dessus des ~150 ms d'un appui qui précède un défilement.
 */
export const MAINTIEN_MS = 350;

/** Au-delà, le doigt qui attendait le maintien défile : on lui rend la page. */
const TOLERANCE_MAINTIEN = 8;

export function reorderable(node: HTMLElement, options: ReorderOptions) {
  let { onReorder } = options;

  let rangee: HTMLElement | null = null;
  let groupe: string | null = null;
  let voisines: HTMLElement[] = [];
  let milieux: number[] = [];
  let hauteurs: number[] = [];
  let depart = 0;
  let courant = 0;
  let departY = 0;
  let dy = 0;
  let pointeur: number | null = null;
  let bouge = false;
  let trame = 0;
  /** Maintien en cours, avant que la rangée ne soit soulevée. */
  let attente: ReturnType<typeof setTimeout> | null = null;
  let attentePointeur: number | null = null;
  let attenteX = 0;
  let attenteY = 0;

  const groupeDe = (el: HTMLElement) => el.dataset.reorderGroup ?? null;
  const rangDe = (el: HTMLElement) => Number(el.dataset.reorderIndex ?? '0');

  function poser(el: HTMLElement, y: number, souleve = false) {
    el.style.transform = y === 0 ? '' : `translate3d(0, ${y}px, 0)`;
    el.style.zIndex = souleve ? '20' : '';
    el.style.position = souleve ? 'relative' : '';
  }

  /**
   * Ouvre le trou : les voisines dépassées reculent d'une hauteur de rangée.
   *
   * **Dessine seulement.** Le rang visé est décidé dans `pointermove`, hors de la
   * trame : une trame sautée ne doit pas faire retomber la rangée à sa place de
   * départ, ce qui est le genre de défaut qui ne se voit qu'une fois sur vingt.
   */
  function redessiner() {
    trame = 0;
    if (!rangee) return;
    poser(rangee, dy, true);

    voisines.forEach((v, i) => {
      if (i === depart) return;
      let decalage = 0;
      if (i > depart && i <= courant) decalage = -hauteurs[depart];
      if (i < depart && i >= courant) decalage = hauteurs[depart];
      poser(v, decalage);
    });
  }

  function relacher() {
    if (trame) cancelAnimationFrame(trame);
    trame = 0;
    voisines.forEach((v) => poser(v, 0));
    if (rangee) {
      rangee.removeAttribute('data-reorder-active');
      poser(rangee, 0);
    }
    rangee = null;
    groupe = null;
    voisines = [];
    milieux = [];
    hauteurs = [];
    pointeur = null;
    bouge = false;
  }

  function annulerAttente() {
    if (attente) clearTimeout(attente);
    attente = null;
    attentePointeur = null;
  }

  /** Soulève la rangée `li` : mesure la fratrie et prend le pointeur. */
  function saisir(li: HTMLElement, capteur: HTMLElement, clientY: number, pointerId: number): boolean {
    const g = groupeDe(li);
    if (!g) return false;

    const fratrie = Array.from(
      node.querySelectorAll<HTMLElement>(`[data-reorder-group="${CSS.escape(g)}"]`)
    ).sort((a, b) => rangDe(a) - rangDe(b));
    if (fratrie.length < 2) return false;

    groupe = g;
    voisines = fratrie;
    rangee = li;
    depart = voisines.indexOf(li);
    courant = depart;
    departY = clientY;
    dy = 0;
    bouge = false;

    const rects = voisines.map((v) => v.getBoundingClientRect());
    milieux = rects.map((r) => r.top + r.height / 2);
    hauteurs = rects.map((r) => r.height);

    rangee.setAttribute('data-reorder-active', '');
    pointeur = pointerId;
    try {
      capteur.setPointerCapture(pointerId);
    } catch {
      // Pointeur déjà relâché entre-temps : le relâché suivant remettra tout en place.
    }
    return true;
  }

  function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || pointeur !== null) return;
    const cible = event.target as HTMLElement | null;

    const poignee = cible?.closest<HTMLElement>('[data-reorder-handle]');
    if (poignee) {
      const li = poignee.closest<HTMLElement>('[data-reorder-group]');
      if (li) saisir(li, poignee, event.clientY, event.pointerId);
      return;
    }

    /*
      Hors de la poignée : le maintien, au doigt seulement. La souris a la poignée et
      son curseur de saisie ; lui imposer un temps d'attente sur toute la rangée ne
      lui apporterait qu'un clic qui traîne.
    */
    if (event.pointerType === 'mouse') return;
    const li = cible?.closest<HTMLElement>('[data-reorder-group]');
    if (!li || !node.contains(li)) return;
    if (cible?.closest('button, a, input, textarea, select, [data-no-swipe]')) return;

    annulerAttente();
    attentePointeur = event.pointerId;
    attenteX = event.clientX;
    attenteY = event.clientY;
    attente = setTimeout(() => {
      const id = attentePointeur;
      attente = null;
      attentePointeur = null;
      if (id === null || pointeur !== null) return;
      if (saisir(li, li, attenteY, id)) {
        // Le signal que la rangée est en main, là où le téléphone sait le donner.
        navigator.vibrate?.(10);
      }
    }, MAINTIEN_MS);
  }

  function onPointerMove(event: PointerEvent) {
    if (attentePointeur !== null && event.pointerId === attentePointeur) {
      // Le doigt part avant la fin du maintien : c'est un défilement, pas une saisie.
      const ecart = Math.hypot(event.clientX - attenteX, event.clientY - attenteY);
      if (ecart > TOLERANCE_MAINTIEN) annulerAttente();
      else attenteY = event.clientY;
      return;
    }
    if (pointeur === null || event.pointerId !== pointeur || !rangee) return;
    dy = event.clientY - departY;
    if (!bouge && Math.abs(dy) < MOUVEMENT_MINIMAL) return;
    bouge = true;
    courant = rangCible(milieux[depart] + dy, milieux, depart);
    /*
      Le doigt tient la poignée : c'est un déplacement, pas un défilement. La poignée
      porte `touch-action: none`, donc le navigateur nous laisse l'axe Y sans qu'on
      ait à l'empêcher ici.
    */
    if (!trame) trame = requestAnimationFrame(redessiner);
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId === attentePointeur) annulerAttente();
    if (pointeur === null || event.pointerId !== pointeur) return;
    const g = groupe;
    const de = depart;
    const vers = bouge ? courant : depart;
    relacher();
    if (g && vers !== de) onReorder(g, de, vers);
  }

  function onPointerCancel() {
    annulerAttente();
    relacher();
  }

  /*
    Une rangée soulevée par maintien ne porte pas `touch-action: none` — la liste doit
    pouvoir défiler depuis elle tant qu'on ne l'a pas saisie. Une fois en main, c'est
    donc ici qu'on retient le défilement : sans cela, iOS reprend la page au premier
    mouvement et annule le pointeur.
  */
  function onTouchMove(event: TouchEvent) {
    if (pointeur !== null && event.cancelable) event.preventDefault();
  }

  /** Android ouvre son menu au maintien : dans une liste à ranger, le maintien saisit. */
  function onContextMenu(event: Event) {
    const cible = event.target as HTMLElement | null;
    if (cible?.closest('[data-reorder-group]')) event.preventDefault();
  }

  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', onPointerUp, { passive: true });
  node.addEventListener('pointercancel', onPointerCancel, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: false });
  node.addEventListener('contextmenu', onContextMenu);

  return {
    update(next: ReorderOptions) {
      onReorder = next.onReorder;
    },
    destroy() {
      annulerAttente();
      relacher();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
