/**
 * Les médias sont servis par le site public, et par lui seul.
 *
 * C'est lui qui porte la liaison R2 et la route `/media/[...key]`. L'espace adhérent
 * n'a ni l'une ni l'autre : une adresse relative y reste sans réponse. Or le contenu
 * enregistré en base est volontairement relatif — `mediaPath()` côté administration,
 * et l'assainisseur n'accepte le `src` d'une image que sous la forme `/media/…` —
 * précisément pour qu'un contenu ne soit pas gravé au domaine qui l'a produit.
 *
 * La résolution appartient donc à l'écran qui affiche, pas à celui qui enregistre.
 *
 * `PUBLIC_WEBSITE_URL` est inliné au build par `apps/storefront/astro.config.mjs` :
 * jamais lu à l'exécution, le runtime Workers levant sur une variable absente.
 */
const WEBSITE_ORIGIN = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

export const websiteOrigin = WEBSITE_ORIGIN;

/** Adresse absolue d'un média, à partir de sa clé stockée en base. */
export function mediaUrl(key: string): string {
  return `${WEBSITE_ORIGIN}/media/${key.replace(/^media\//, '')}`;
}

/**
 * Réécrit les médias d'un corps de texte vers le domaine du site public.
 *
 * Vise `src`, `href` et `srcset`. Les deux premiers sont les seules formes que
 * l'assainisseur laisse passer dans le contenu stocké ; le troisième est posé **au
 * rendu**, quand les images du corps sont servies à leur taille utile. L'oublier serait
 * pire que de ne rien faire : une `<source>` qui correspond l'emporte sur l'`<img>` de
 * repli, et l'image ne s'afficherait pas du tout dans l'espace adhérent.
 *
 * Sans origine (tests de composants, Storybook), le texte est rendu inchangé : aucune
 * image n'y est réellement chargée.
 */
export function withWebsiteMedia(html: string): string {
  return rewriteMediaPaths(html, WEBSITE_ORIGIN);
}

/**
 * Le même travail, l'origine passée en argument — c'est ce que les tests exercent,
 * `PUBLIC_WEBSITE_URL` n'étant pas inlinée hors d'un build d'application.
 */
export function rewriteMediaPaths(html: string, origin: string): string {
  if (!origin) return html;
  return html
    .replace(/(\s(?:src|href)=")\/media\//g, `$1${origin}/media/`)
    // `srcset` porte plusieurs adresses séparées par des virgules : c'est la valeur
    // entière qu'il faut parcourir, et non son seul début.
    .replace(/\ssrcset="([^"]*)"/g, (attribute, value: string) =>
      attribute.replace(value, value.replaceAll('/media/', `${origin}/media/`))
    );
}
