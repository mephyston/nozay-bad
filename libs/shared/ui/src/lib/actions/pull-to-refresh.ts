/**
 * Tirer pour rafraîchir, sur le conteneur défilant.
 *
 * En PWA installée, iOS ne fournit plus son propre geste de rechargement : la
 * fenêtre n'a pas de barre d'adresse à tirer. Celui-ci comble ce manque, et ne
 * s'active que sur écran tactile — à la souris, il n'a aucun sens.
 *
 * Il ne prend le geste qu'en haut de course, et suit les mêmes garde-fous que le
 * balayage de ligne : verrou d'axe, abandon si le geste est horizontal,
 * `pointercancel` traité, rien de persisté.
 */

export type PullToRefreshOptions = {
  /** Déclenchée au relâché au-delà du seuil. Le rafraîchissement lui appartient. */
  onRefresh: () => void | Promise<void>;
  /** Distance à parcourir, en pixels, avant que le relâché ne rafraîchisse. */
  threshold?: number;
  enabled?: boolean;
};

const SEUIL_AXE = 8;
const FREIN = 0.5;

/**
 * La rotation continue du témoin, injectée une fois pour toutes : le témoin est
 * posé sur `document.body`, hors de portée du style scopé d'un composant.
 */
function injecterStyle() {
  if (document.getElementById('nba-ptr-style')) return;
  const style = document.createElement('style');
  style.id = 'nba-ptr-style';
  style.textContent =
    '@keyframes nba-ptr-spin{to{transform:translateX(-50%) rotate(360deg)}}' +
    '[data-nba-ptr][data-spinning]{animation:nba-ptr-spin .8s linear infinite}';
  document.head.appendChild(style);
}

export function pullToRefresh(node: HTMLElement, options: PullToRefreshOptions) {
  let opts = { threshold: 72, enabled: true, ...options };

  injecterStyle();

  const temoin = document.createElement('div');
  temoin.setAttribute('aria-hidden', 'true');
  temoin.setAttribute('data-nba-ptr', '');
  temoin.style.cssText = [
    'position:fixed',
    'left:50%',
    'z-index:40',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:2rem',
    'height:2rem',
    'border-radius:9999px',
    'background:var(--card)',
    'border:1px solid var(--border)',
    'color:var(--muted-foreground)',
    'pointer-events:none',
    'opacity:0',
  ].join(';');
  temoin.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

  let hautConteneur = 0;
  let departY = 0;
  let departX = 0;
  let distance = 0;
  let actif = false;
  let enCours = false;
  let pointeur: number | null = null;
  let trame = 0;

  const mouvementReduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function afficher(d: number) {
    // Pendant le geste, le doigt est suivi sans latence.
    node.style.transition = 'none';
    const progression = Math.min(d / opts.threshold, 1);
    temoin.style.opacity = String(progression);
    temoin.style.top = `${hautConteneur + d - 16}px`;
    temoin.style.transform = `translateX(-50%) rotate(${progression * 270}deg)`;
    node.style.transform = `translate3d(0, ${d}px, 0)`;
  }

  function reposer() {
    temoin.style.opacity = '0';
    temoin.style.transform = 'translateX(-50%)';
    node.style.transition = mouvementReduit() ? 'none' : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)';
    node.style.transform = '';
  }

  function onPointerDown(e: PointerEvent) {
    // Souris exclue : le geste n'existe qu'au doigt.
    if (!opts.enabled || enCours || e.pointerType === 'mouse' || !e.isPrimary) return;
    if (node.scrollTop > 0) return;
    departY = e.clientY;
    departX = e.clientX;
    distance = 0;
    actif = false;
    pointeur = e.pointerId;
    hautConteneur = node.getBoundingClientRect().top;
  }

  function onPointerMove(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    const dy = e.clientY - departY;
    const dx = e.clientX - departX;

    if (!actif) {
      if (Math.abs(dy) < SEUIL_AXE && Math.abs(dx) < SEUIL_AXE) return;
      // Vers le haut ou de biais : ce n'est pas notre geste.
      if (dy <= 0 || Math.abs(dy) <= Math.abs(dx)) {
        fin();
        return;
      }
      actif = true;
      node.setAttribute('data-pulling', '');
    }

    // Frein constant : la liste ne suit jamais le doigt au pixel, ce qui dit
    // qu'on est au bout et non en train de défiler.
    distance = dy * FREIN;
    if (!trame) {
      trame = requestAnimationFrame(() => {
        trame = 0;
        afficher(distance);
      });
    }
  }

  async function onPointerUp(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    const declenche = actif && distance >= opts.threshold;
    fin();
    if (!declenche) {
      reposer();
      return;
    }
    enCours = true;
    temoin.style.opacity = '1';
    temoin.style.top = `${hautConteneur + opts.threshold - 16}px`;
    if (!mouvementReduit()) temoin.dataset.spinning = '';
    node.style.transform = `translate3d(0, ${opts.threshold}px, 0)`;
    try {
      await opts.onRefresh();
    } finally {
      delete temoin.dataset.spinning;
      enCours = false;
      reposer();
    }
  }

  function fin() {
    if (trame) cancelAnimationFrame(trame);
    trame = 0;
    if (pointeur !== null && node.hasPointerCapture(pointeur)) node.releasePointerCapture(pointeur);
    pointeur = null;
    actif = false;
    node.removeAttribute('data-pulling');
  }

  function onPointerCancel(e: PointerEvent) {
    if (pointeur !== e.pointerId) return;
    fin();
    reposer();
  }

  document.body.appendChild(temoin);
  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerup', onPointerUp, { passive: true });
  node.addEventListener('pointercancel', onPointerCancel, { passive: true });

  return {
    update(o: PullToRefreshOptions) {
      opts = { threshold: 72, enabled: true, ...o };
    },
    destroy() {
      fin();
      reposer();
      temoin.remove();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
