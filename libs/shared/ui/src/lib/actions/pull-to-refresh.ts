/**
 * Tirer pour rafraîchir, sur le conteneur défilant.
 *
 * En PWA installée, iOS ne fournit plus son propre geste de rechargement : la
 * fenêtre n'a pas de barre d'adresse à tirer. Celui-ci comble ce manque.
 *
 * **Événements tactiles et non `pointer`.** C'est le point qui fait ou défait ce
 * geste : en haut de course, le navigateur s'empare du glissé pour faire rebondir
 * la page et émet aussitôt un `pointercancel` — le geste mourait avant d'avoir
 * commencé, sans rien afficher. Seul un `touchmove` non passif permet de lui
 * reprendre la main par `preventDefault`. C'est aussi pourquoi le geste n'existe
 * qu'au doigt : à la souris, il n'aurait aucun sens.
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
    'top:-3rem',
    'z-index:60',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:2rem',
    'height:2rem',
    'border-radius:9999px',
    'background:var(--card)',
    'border:1px solid var(--border)',
    'box-shadow:0 2px 8px rgb(0 0 0 / 0.12)',
    'color:var(--muted-foreground)',
    'pointer-events:none',
    'opacity:0',
    'transform:translateX(-50%)',
  ].join(';');
  temoin.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

  let hautConteneur = 0;
  let departY = 0;
  let departX = 0;
  let distance = 0;
  let actif = false;
  let enCours = false;
  let trame = 0;

  const mouvementReduit = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function afficher(d: number) {
    const progression = Math.min(d / opts.threshold, 1);
    node.style.transition = 'none';
    node.style.transform = `translate3d(0, ${d}px, 0)`;
    // Un plancher d'opacité : dès que le geste est pris, le témoin doit se voir.
    // À la seule progression, il restait fantomatique sur les premiers pixels.
    temoin.style.opacity = String(0.35 + 0.65 * progression);
    temoin.style.top = `${hautConteneur + d - 16}px`;
    temoin.style.transform = `translateX(-50%) rotate(${progression * 270}deg)`;
  }

  function reposer() {
    temoin.style.opacity = '0';
    temoin.style.top = '-3rem';
    temoin.style.transform = 'translateX(-50%)';
    node.style.transition = mouvementReduit()
      ? 'none'
      : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)';
    node.style.transform = '';
  }

  function onTouchStart(e: TouchEvent) {
    if (!opts.enabled || enCours || e.touches.length !== 1) return;
    if (node.scrollTop > 0) return;
    departY = e.touches[0].clientY;
    departX = e.touches[0].clientX;
    distance = 0;
    actif = false;
    hautConteneur = node.getBoundingClientRect().top;
  }

  function onTouchMove(e: TouchEvent) {
    if (!opts.enabled || enCours || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - departY;
    const dx = e.touches[0].clientX - departX;

    if (!actif) {
      if (Math.abs(dy) < SEUIL_AXE && Math.abs(dx) < SEUIL_AXE) return;
      // Vers le haut, de biais, ou plus en haut de course : ce n'est pas notre geste.
      if (dy <= 0 || Math.abs(dy) <= Math.abs(dx) || node.scrollTop > 0) return;
      actif = true;
      node.setAttribute('data-pulling', '');
    }

    // Reprend la main sur le rebond natif, qui sinon annulerait tout.
    if (e.cancelable) e.preventDefault();

    // Frein constant : la liste ne suit jamais le doigt au pixel, ce qui dit
    // qu'on est au bout de la course et non en train de défiler.
    distance = dy * FREIN;
    if (!trame) {
      trame = requestAnimationFrame(() => {
        trame = 0;
        afficher(distance);
      });
    }
  }

  async function onTouchEnd() {
    if (!actif) return;
    const declenche = distance >= opts.threshold;
    fin();
    if (!declenche) {
      reposer();
      return;
    }
    enCours = true;
    temoin.style.opacity = '1';
    temoin.style.top = `${hautConteneur + opts.threshold - 16}px`;
    if (!mouvementReduit()) temoin.dataset.spinning = '';
    node.style.transition = 'none';
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
    actif = false;
    node.removeAttribute('data-pulling');
  }

  function onTouchCancel() {
    fin();
    reposer();
  }

  document.body.appendChild(temoin);
  /**
   * Sans cela, iOS chaîne le débordement au document : c'est lui qui rebondit, le
   * `touchmove` arrive déjà non annulable, et `preventDefault` n'a plus prise.
   */
  const debordementInitial = node.style.overscrollBehaviorY;
  node.style.overscrollBehaviorY = 'contain';
  node.addEventListener('touchstart', onTouchStart, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: false });
  node.addEventListener('touchend', onTouchEnd, { passive: true });
  node.addEventListener('touchcancel', onTouchCancel, { passive: true });

  return {
    update(o: PullToRefreshOptions) {
      opts = { threshold: 72, enabled: true, ...o };
    },
    destroy() {
      fin();
      reposer();
      temoin.remove();
      node.style.overscrollBehaviorY = debordementInitial;
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
    },
  };
}
