/**
 * Ouvrir un document (PDF) sans y enfermer l'utilisateur.
 *
 * Dans un navigateur, un document s'ouvre dans un nouvel onglet : l'écran de départ
 * reste sous la main et l'onglet se ferme d'un geste. En application installée (mode
 * `standalone`), ce même geste ouvre une fenêtre neuve — sans barre d'adresse, sans
 * onglets et sans historique. « Précédent » n'y mène nulle part, et il ne reste qu'à
 * tuer l'application. Là, le document doit remplacer l'écran courant, que le geste de
 * retour ramène ensuite.
 *
 * Même détection que le splash et la bannière d'installation : `display-mode` pour
 * Android et le bureau, `navigator.standalone` pour iOS, qui ne renseigne que lui.
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Ouvre `href` selon le contexte : nouvel onglet dans un navigateur, même fenêtre en
 * application installée. Une navigation native dans les deux cas : le `<ClientRouter />`
 * de l'admin n'a rien à échanger, la réponse n'est pas du HTML.
 */
export function openDocument(href: string): void {
  if (isStandaloneApp()) {
    window.location.assign(href);
    return;
  }
  window.open(href, '_blank', 'noopener');
}
