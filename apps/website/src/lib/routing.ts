/**
 * Décisions de routage du middleware.
 *
 * Extraites ici pour être testées **telles qu'elles s'exécutent** : `astro:middleware`
 * n'est pas importable hors de son runtime, et reproduire la logique dans le test la
 * laisserait diverger en silence de celle qui tourne réellement.
 */

/**
 * La requête vient-elle de la machine du développeur ?
 *
 * Le contrôle porte sur l'hôte demandé, jamais sur une variable d'environnement :
 * `APP_ENV` vient de `wrangler.json` et n'existe pas sous `astro dev`, et
 * `PUBLIC_APP_ENV` retombe sur « production » quand il n'est pas posé. S'y fier a
 * produit exactement ce qu'il fallait éviter — `localhost:4323` renvoyé en 301 vers
 * `nozaybad.fr:4323`, et un 301 reste en cache dans le navigateur indéfiniment.
 */
export function isLocalHost(hostname: string): boolean {
  // `URL.hostname` rend une adresse IPv6 **entre crochets** : « [::1] », et non
  // « ::1 ». Comparer à la forme nue laissait passer la redirection, et le test ne
  // l'a pas vu parce qu'il vérifiait la chaîne supposée plutôt que celle produite.
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    host === '0.0.0.0' ||
    /^127\./.test(host)
  );
}

/**
 * Faut-il ajouter la barre oblique finale ?
 *
 * Toutes les URL héritées de WordPress se terminent par une barre, et ce sont elles
 * qui sont indexées : servir les deux formes dédoublerait chaque page. Mais un chemin
 * dont le dernier segment porte une extension désigne un fichier — média, sitemap,
 * flux — et le réécrire donnerait `/media/<clé>/400.webp/`, qui n'est pas une adresse
 * d'image. C'est ce que faisait `trailingSlash: 'always'` d'Astro, appliqué sans
 * distinction, et qui mettait tous les médias en 404.
 */
export function needsTrailingSlash(pathname: string): boolean {
  if (pathname === '/' || pathname.endsWith('/')) return false;
  const lastSegment = pathname.split('/').pop() ?? '';
  return !lastSegment.includes('.');
}
