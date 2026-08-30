/**
 * Les pages d'administration qui acceptent encore une écriture.
 *
 * ## Le silence qu'on ferme ici
 *
 * Astro répond à un `POST` visant une page **sans gestionnaire** en rendant simplement le
 * HTML de cette page, avec un **200**. Un composant qui poste vers son hôte — et il en
 * existe quatre formes dans ce dépôt : `fetch('')`, l'URL de page écrite en dur,
 * `window.location.pathname`, et `` `?season=…` `` — voit donc une réponse réussie pour
 * une écriture qui n'a jamais eu lieu. Le toast annonce « enregistré », rien n'a bougé, et
 * l'utilisateur cherche la panne du côté de sa saisie.
 *
 * C'est arrivé deux fois pendant la conversion des écrans en coquilles, dont une en
 * production de préproduction. Le motif est toujours le même : une page perd son
 * gestionnaire, un composant continue de la viser.
 *
 * Le middleware refuse donc en **405** toute écriture visant une page absente de cette
 * liste. Un refus franc, à l'endroit et au moment où la faute se produit.
 *
 * ## Comment la tenir
 *
 * Cette liste rétrécit à mesure que les rubriques passent en coquilles : une page dont les
 * écritures rejoignent un relais doit en sortir. `page-writes.test.ts` la compare aux
 * gestionnaires réellement déclarés dans les pages, dans les deux sens — un oubli d'un
 * côté comme de l'autre échoue.
 *
 * Autant dire que c'est aussi la liste de ce qui reste à convertir.
 */
export const PAGES_AVEC_ECRITURE = [
  '/admin/members/import'
] as const;

/** Les méthodes qui ne modifient rien, et qu'aucune page n'a à déclarer. */
const LECTURES = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cette requête peut-elle atteindre cette page ?
 *
 * Faux pour une écriture visant une page qui n'en déclare pas — le cas que le middleware
 * transforme en 405.
 */
export function accepteEcriture(pathname: string, method: string): boolean {
  if (LECTURES.has(method.toUpperCase())) return true;
  const chemin = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (PAGES_AVEC_ECRITURE as readonly string[]).includes(chemin);
}
