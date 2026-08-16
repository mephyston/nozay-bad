/**
 * Mémorise l'état plié/déplié d'une section, d'une navigation à l'autre.
 *
 * Les écrans d'administration rechargent la page à chaque enregistrement — c'est un choix
 * assumé, il évite de recomposer côté navigateur une logique qui vit sur le serveur. Mais
 * l'île est alors remontée, et une section repliable repart à son état initial : on
 * déplie, on enregistre, et le bloc se referme sous les doigts.
 *
 * `sessionStorage` plutôt que `localStorage` : le pli d'une section est une commodité de
 * la session en cours, pas une préférence à retenir d'un jour sur l'autre.
 */

const PREFIX = 'collapse:';

export function readCollapseState(key: string, fallback: boolean): boolean {
  try {
    const stored = sessionStorage.getItem(PREFIX + key);
    return stored === null ? fallback : stored === '1';
  } catch {
    // Stockage refusé (navigation privée, réglage strict) : le repli vaut pour l'écran.
    return fallback;
  }
}

export function writeCollapseState(key: string, open: boolean): void {
  try {
    sessionStorage.setItem(PREFIX + key, open ? '1' : '0');
  } catch {
    /* Sans stockage, l'état ne survit pas au rechargement — sans conséquence ailleurs. */
  }
}
