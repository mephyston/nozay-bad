/**
 * Adresse publique d'un média, telle que l'administration doit l'écrire.
 *
 * Les octets d'un média sont servis par **le site public**, et par lui seul : c'est
 * lui qui porte la liaison R2 et la route `/media/[...key]`, avec son cache immuable
 * d'un an. L'administration, elle, n'a ni l'un ni l'autre — son `wrangler.json` ne
 * déclare aucun conteneur R2.
 *
 * D'où le bogue que cette fonction corrige : les écrans d'administration écrivaient
 * `src="/media/…"`, une adresse **relative**, donc résolue sur leur propre domaine, où
 * rien ne répond. Le dépôt d'un fichier réussissait, sa vignette restait vide, et une
 * image attachée à un bloc ne s'affichait pas davantage.
 *
 * `PUBLIC_WEBSITE_URL` est inliné au build par `apps/admin/astro.config.mjs` — jamais
 * lu à l'exécution, le runtime Workers levant sur un accès à une variable absente.
 * Le repli sur la chaîne vide garde une adresse relative là où la variable n'existe
 * pas — tests de composants et Storybook —, ce qui n'y coûte rien : aucune image n'y
 * est réellement chargée.
 */
/*
  Accès de membre littéral, sans `?.` : c'est la forme que la clé du `define` déclare,
  donc la seule que la substitution statique du build reconnaît à coup sûr. Au
  développement la question ne se pose pas — Vite y résout `import.meta.env` à
  l'exécution — mais autant écrire la forme qui vaut dans les deux cas.
*/
const WEBSITE_ORIGIN = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

/**
 * Chemin **relatif** d'un média : `/media/<clé>`.
 *
 * C'est la forme à écrire partout où l'adresse est **enregistrée** — un lien de
 * document inséré dans un texte, par exemple. Y graver le domaine coupleraient le
 * contenu à l'environnement qui l'a produit : la préproduction écrirait des liens
 * vers la préproduction, et un changement de domaine casserait tout l'existant.
 *
 * L'assainisseur le vérifie d'ailleurs : `mediaSrcAttribute` n'accepte le `src` d'une
 * image que sous la forme d'un chemin de même origine commençant par `/media/`, et
 * jette tout le reste.
 *
 * @param key Clé stockée en base, avec ou sans son préfixe `media/`.
 */
export function mediaPath(key: string): string {
  return `/media/${key.replace(/^media\//, '')}`;
}

/**
 * Adresse **absolue** d'un média, sur le domaine du site public.
 *
 * C'est la forme à écrire partout où l'adresse est seulement **affichée dans
 * l'administration** — vignette de la médiathèque, aperçu d'une image attachée à un
 * bloc. Rien de ceci n'est enregistré : ces adresses ne vivent que le temps d'un écran.
 *
 * @param key Clé stockée en base, avec ou sans son préfixe `media/`.
 */
export function mediaUrl(key: string): string {
  return `${WEBSITE_ORIGIN}${mediaPath(key)}`;
}
