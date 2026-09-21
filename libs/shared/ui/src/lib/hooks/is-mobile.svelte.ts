import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 768;

export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`(max-width: ${breakpoint - 1}px)`);
	}
}

/**
 * `IsMobile`, ou un substitut constant là où `matchMedia` n'existe pas.
 *
 * Deux environnements en sont dépourvus : le rendu serveur, où `window` n'existe
 * pas, et jsdom, où il existe **sans** `matchMedia` — d'où la garde sur la
 * fonction et pas seulement sur `window`. Sans elle, tout composant qui interroge
 * la largeur d'écran tombe au rendu serveur.
 *
 * Le substitut répond « bureau » : c'est la présentation la plus complète, et
 * l'hydratation corrige aussitôt côté navigateur.
 */
export function creerIsMobile(breakpoint?: number): { readonly current: boolean } {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return {
			get current() {
				return false;
			},
		};
	}
	return new IsMobile(breakpoint);
}
