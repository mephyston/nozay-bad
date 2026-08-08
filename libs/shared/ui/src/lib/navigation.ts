import { navigate } from 'astro:transitions/client';

/**
 * Le `<ClientRouter />` est-il actif sur cette page ?
 *
 * On teste le marqueur posé par Astro lui-même, celui que consulte son routeur avant
 * de choisir entre échange de DOM et `location.href` (cf. `transitionEnabledOnThisPage`
 * dans `astro/dist/transitions/router.js`). Sonder le même signal garantit qu'on ne
 * peut pas diverger de la décision réelle du routeur.
 *
 * L'admin monte le `<ClientRouter />`, pas le storefront : tout code partagé doit
 * fonctionner dans les deux cas.
 */
export function hasClientRouter(): boolean {
  return typeof document !== 'undefined'
    && !!document.querySelector('[name="astro-view-transitions-enabled"]');
}

/**
 * Navigue vers `url` sans détruire le document.
 *
 * Remplace les `window.location.href = ...` : le ClientRouter refait un `fetch` du HTML
 * et échange le DOM, ce qui préserve le contexte JS et les îles `transition:persist`
 * (sidebar, Toaster). En l'absence de router, `navigate()` retombe de lui-même sur
 * `location.href` — le comportement est donc sûr partout.
 *
 * Rester sur la même URL (rafraîchir après une écriture, réappliquer des filtres
 * identiques) remplace l'entrée d'historique au lieu d'en empiler une, pour que le
 * bouton « Précédent » ramène bien à l'écran d'avant et non au même écran.
 */
export function softNavigate(url: string): void {
  const target = new URL(url, window.location.href).href;
  const isRefresh = target === window.location.href;
  void navigate(target, isRefresh ? { history: 'replace' } : undefined);
}
