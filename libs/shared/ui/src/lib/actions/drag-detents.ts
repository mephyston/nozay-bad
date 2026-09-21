/**
 * Feuille basse glissable à paliers.
 *
 * Même mathématique que `swipe-actions` — verrou d'axe, rappel élastique, calage
 * à la vélocité — sur l'axe Y. C'est la raison pour laquelle ce dépôt n'a pas
 * besoin d'une bibliothèque de tiroir : le difficile (piège à focus, verrou de
 * défilement, `Escape`, portail) vient déjà de `bits-ui`, et il ne restait que la
 * translation.
 *
 * Les paliers sont des fractions de la hauteur **visible**, lue sur
 * `visualViewport` quand il existe : c'est ce qui fait qu'un clavier logiciel
 * ouvert ne pousse pas le bouton d'enregistrement sous le pli.
 */

export type DragDetentsOptions = {
  /** Fractions de la hauteur visible, croissantes. */
  detents?: number[];
  /** Palier actif, en index. */
  detent?: number;
  onDetent?: (index: number) => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  /**
   * Désactivée, l'action rend l'élément à sa mise en page normale. C'est ce qui
   * permet au même nœud d'être une feuille basse sous 768 px et un panneau
   * latéral au-dessus, sans remonter son contenu au franchissement du seuil.
   */
  enabled?: boolean;
};

const SEUIL_AXE = 6;
const RESSORT = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)';
/** Au-delà, le geste est un rejet quelle que soit la distance parcourue. */
const VELOCITE_REJET = 0.55;

export function dragDetents(node: HTMLElement, options: DragDetentsOptions = {}) {
  const normaliser = (o: DragDetentsOptions, palierCourant: number) => ({
    detents: o.detents ?? [1],
    detent: o.detent ?? palierCourant,
    dismissible: o.dismissible ?? true,
    enabled: o.enabled ?? true,
    onDetent: o.onDetent,
    onDismiss: o.onDismiss,
  });

  let opts = normaliser(options, options.detent ?? 0);

  let hauteurVisible = 0;
  let palier = opts.detent;
  let depart = 0;
  let departOffset = 0;
  let depuis = 0;
  let dy = 0;
  let actif = false;
  let pointeur: number | null = null;
  let trame = 0;
  let premiereMesure = true;

  const mouvementReduit = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const max = () => Math.max(...opts.detents);
  const hauteurFeuille = () => hauteurVisible * max();
  /** Distance dont la feuille est descendue pour n'exposer que ce palier. */
  const offsetDe = (index: number) => (max() - opts.detents[index]) * hauteurVisible;

  function mesurer() {
    if (!opts.enabled) {
      node.style.height = '';
      node.style.transform = '';
      node.style.transition = '';
      node.style.removeProperty('--nba-sheet-offset');
      document.documentElement.style.removeProperty('--nba-sheet-progress');
      return;
    }
    hauteurVisible = window.visualViewport?.height ?? window.innerHeight;
    node.style.height = `${hauteurFeuille()}px`;
    if (actif) return;

    if (premiereMesure && !mouvementReduit()) {
      // La feuille monte depuis le bord bas, d'où vient le doigt qui l'a demandée.
      // Sans cela elle apparaissait d'un coup, déjà en place : la translation est
      // posée en ligne par cette action, donc aucune animation CSS ne peut la jouer.
      premiereMesure = false;
      node.style.transition = 'none';
      poser(hauteurFeuille());
      requestAnimationFrame(() => {
        node.style.transition = RESSORT;
        poser(offsetDe(palier));
      });
      return;
    }

    premiereMesure = false;
    poser(offsetDe(palier));
  }

  function poser(y: number) {
    node.style.transform = `translate3d(0, ${y}px, 0)`;
    // La feuille descend, mais son pied doit rester sur le bord visible de l'écran :
    // il se relève d'autant. Sans quoi, au palier bas, le bouton d'enregistrement
    // sort par le bas — le défaut même qu'une feuille à paliers doit éviter.
    node.style.setProperty('--nba-sheet-offset', `${y}px`);
    // Le voile s'estompe avec la feuille. Lu par l'overlay, qui n'est pas un
    // descendant : la variable vit donc sur la racine du document.
    const progression = 1 - y / Math.max(hauteurFeuille(), 1);
    document.documentElement.style.setProperty('--nba-sheet-progress', String(Math.max(0, Math.min(1, progression))));
  }

  function caler(index: number) {
    node.style.transition = mouvementReduit() ? 'none' : RESSORT;
    palier = index;
    poser(offsetDe(index));
    opts.onDetent?.(index);
  }

  const zoneDefilante = (cible: Element | null) => cible?.closest<HTMLElement>('[data-sheet-scroll]') ?? null;

  function onPointerDown(e: PointerEvent) {
    if (!opts.enabled || !e.isPrimary || e.button !== 0) return;
    const cible = e.target as Element | null;
    if (cible?.closest('[data-no-drag]')) return;

    const surPoignee = !!cible?.closest('[data-grabber]');
    const zone = zoneDefilante(cible);
    // Le contenu défile, la feuille ne glisse que depuis le haut : sinon le geste
    // volerait le défilement à un formulaire plus long que l'écran.
    if (!surPoignee && zone && zone.scrollTop > 0) return;

    depart = e.clientY;
    departOffset = offsetDe(palier);
    depuis = performance.now();
    dy = 0;
    actif = false;
    pointeur = e.pointerId;
    (node as HTMLElement).dataset.sheetCandidate = surPoignee ? 'poignee' : 'contenu';
  }

  function onPointerMove(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    const ecart = e.clientY - depart;

    if (!actif) {
      if (Math.abs(ecart) < SEUIL_AXE) return;
      // Depuis le contenu en haut de course, seule la descente nous revient :
      // vers le haut, c'est au défilement natif de reprendre la main.
      if (node.dataset.sheetCandidate === 'contenu' && ecart < 0) {
        fin();
        return;
      }
      actif = true;
      node.style.transition = 'none';
      node.setAttribute('data-sheet-dragging', '');
      node.setPointerCapture(e.pointerId);
    }

    let y = departOffset + ecart;
    const plancher = offsetDe(opts.detents.length - 1);
    // Vers le haut, au-delà du plus grand palier, la feuille résiste.
    if (y < plancher) y = plancher - (plancher - y) * 0.2;
    if (!opts.dismissible) y = Math.min(y, offsetDe(0));
    dy = y;

    if (!trame) {
      trame = requestAnimationFrame(() => {
        trame = 0;
        poser(dy);
      });
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    const etaitActif = actif;
    const y = dy;
    const vitesse = (y - departOffset) / Math.max(performance.now() - depuis, 1);
    fin();
    if (!etaitActif) return;

    const rejet = opts.dismissible && (vitesse > VELOCITE_REJET || y > offsetDe(0) + hauteurVisible * 0.15);
    if (rejet) {
      node.style.transition = mouvementReduit() ? 'none' : RESSORT;
      poser(hauteurFeuille());
      opts.onDismiss?.();
      return;
    }
    // Sinon, le palier le plus proche — en tenant compte de l'élan.
    const vise = y + vitesse * 120;
    let meilleur = 0;
    let ecartMin = Infinity;
    opts.detents.forEach((_, i) => {
      const d = Math.abs(offsetDe(i) - vise);
      if (d < ecartMin) {
        ecartMin = d;
        meilleur = i;
      }
    });
    caler(meilleur);
  }

  function fin() {
    if (trame) cancelAnimationFrame(trame);
    trame = 0;
    if (pointeur !== null && node.hasPointerCapture(pointeur)) node.releasePointerCapture(pointeur);
    pointeur = null;
    actif = false;
    delete node.dataset.sheetCandidate;
    node.removeAttribute('data-sheet-dragging');
  }

  /**
   * Le seul écouteur non passif du lot : `pointermove` ne suffit pas à empêcher le
   * défilement, il faut refuser le `touchmove` pendant que la feuille glisse.
   */
  function onTouchMove(e: TouchEvent) {
    if (actif) e.preventDefault();
  }

  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', onPointerUp, { passive: true });
  node.addEventListener('pointercancel', fin, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: false });
  window.visualViewport?.addEventListener('resize', mesurer);
  window.addEventListener('resize', mesurer);
  mesurer();

  return {
    update(o: DragDetentsOptions = {}) {
      const paliersChanges = JSON.stringify(o.detents) !== JSON.stringify(opts.detents);
      opts = normaliser(o, palier);
      if (paliersChanges) palier = Math.min(palier, opts.detents.length - 1);
      if (o.detent !== undefined && o.detent !== palier) palier = o.detent;
      mesurer();
    },
    destroy() {
      fin();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', fin);
      node.removeEventListener('touchmove', onTouchMove);
      window.visualViewport?.removeEventListener('resize', mesurer);
      window.removeEventListener('resize', mesurer);
      document.documentElement.style.removeProperty('--nba-sheet-progress');
    },
  };
}
