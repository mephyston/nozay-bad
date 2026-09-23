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
 * **Le geste ne part que de la poignée.** Ailleurs, la liste défile normalement :
 * c'est ce qui permet de garder une liste ordinaire et de n'en faire une liste
 * réordonnable qu'à la demande, sans confisquer le défilement.
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

  function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || pointeur !== null) return;
    const cible = event.target as HTMLElement | null;
    const poignee = cible?.closest<HTMLElement>('[data-reorder-handle]');
    if (!poignee) return;

    const li = poignee.closest<HTMLElement>('[data-reorder-group]');
    if (!li) return;

    groupe = groupeDe(li);
    if (!groupe) return;

    voisines = Array.from(
      node.querySelectorAll<HTMLElement>(`[data-reorder-group="${CSS.escape(groupe)}"]`)
    ).sort((a, b) => rangDe(a) - rangDe(b));
    if (voisines.length < 2) return;

    rangee = li;
    depart = voisines.indexOf(li);
    courant = depart;
    departY = event.clientY;
    dy = 0;
    bouge = false;

    const rects = voisines.map((v) => v.getBoundingClientRect());
    milieux = rects.map((r) => r.top + r.height / 2);
    hauteurs = rects.map((r) => r.height);

    rangee.setAttribute('data-reorder-active', '');
    pointeur = event.pointerId;
    poignee.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
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
    if (pointeur === null || event.pointerId !== pointeur) return;
    const g = groupe;
    const de = depart;
    const vers = bouge ? courant : depart;
    relacher();
    if (g && vers !== de) onReorder(g, de, vers);
  }

  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', onPointerUp, { passive: true });
  node.addEventListener('pointercancel', relacher, { passive: true });

  return {
    update(next: ReorderOptions) {
      onReorder = next.onReorder;
    },
    destroy() {
      relacher();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', relacher);
    }
  };
}
