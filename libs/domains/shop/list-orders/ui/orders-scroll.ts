/**
 * La position dans la liste, à travers le rechargement d'une décision.
 *
 * Valider, encaisser, livrer rechargent l'écran pour montrer l'état frais. Les critères
 * survivent par l'URL, mais le conteneur défilant repartait en haut : on encaissait le
 * trentième maillot d'une liste de cent et l'on devait redescendre le chercher.
 *
 * La position n'est rendue qu'à la même adresse et dans les secondes qui suivent : une
 * décision refusée, ou une autre page ouverte entre-temps, ne doit pas faire sauter
 * l'écran plus tard.
 */
const CLE = 'commandes:defilement';
const DUREE_MS = 15_000;

const racine = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-scroll-root]');
const adresse = (): string => `${window.location.pathname}${window.location.search}`;

export function retenirDefilement(): void {
  const r = racine();
  if (!r) return;
  try {
    sessionStorage.setItem(CLE, JSON.stringify({ adresse: adresse(), haut: r.scrollTop, le: Date.now() }));
  } catch {
    // Stockage indisponible : on perd la position, jamais la décision.
  }
}

export function oublierDefilement(): void {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    // idem
  }
}

/** À appeler une fois la liste rendue. */
export function rendreDefilement(): void {
  let brut: string | null = null;
  try {
    brut = sessionStorage.getItem(CLE);
    sessionStorage.removeItem(CLE);
  } catch {
    return;
  }
  if (!brut) return;
  try {
    const { adresse: memorisee, haut, le } = JSON.parse(brut);
    if (memorisee !== adresse() || Date.now() - le > DUREE_MS || typeof haut !== 'number') return;
    // Une image plus tard : la table vient d'être montée, sa hauteur n'est pas encore là.
    requestAnimationFrame(() => racine()?.scrollTo({ top: haut, behavior: 'instant' }));
  } catch {
    // Contenu illisible : on reste en haut.
  }
}
