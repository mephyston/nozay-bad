import type { CmsMediaVariantRow } from './schema';

/**
 * Sert les images d'un texte riche à la bonne taille, au rendu.
 *
 * Une image insérée dans un article porte le chemin de son **original** : le navigateur
 * télécharge donc le fichier entier, puis le réduit à l'écran. Une photo sortie d'un
 * téléphone pèse plusieurs mégaoctets, affichée à 400 px dans un gymnase où le réseau
 * est ce qu'il est.
 *
 * La correction se fait ici, au rendu, et **jamais dans le HTML enregistré** : la liste
 * blanche de `@nba/html` refuse `picture`, `source` et `srcset`, et c'est très bien
 * ainsi — le contenu stocké reste un contenu, réversible et indépendant des
 * déclinaisons qui existaient le jour où on l'a écrit. En contrepartie, tous les
 * articles déjà publiés en bénéficient sans que personne ne les rouvre.
 *
 * L'`<img>` d'origine est conservé tel quel à l'intérieur du `<picture>` : c'est le
 * repli du navigateur, et la garantie qu'un défaut de cette fonction dégrade le poids,
 * jamais l'affichage.
 */

/** `media/<empreinte>/<largeur>.<format>` ou `media/<empreinte>/original.<ext>`. */
const HASH_IN_KEY = /^(?:media\/)?([0-9a-f]{8,64})\//;

/** `src="/media/<empreinte>/…"`, la seule forme que l'assainisseur laisse passer. */
const IMG_TAG = /<img\b[^>]*>/gi;
const SRC_ATTRIBUTE = /\bsrc="\/media\/([0-9a-f]{8,64})\/[^"]*"/i;
const WIDTH_ATTRIBUTE = /\bwidth="(\d+)"/i;

function hashOfKey(key: string): string | null {
  return HASH_IN_KEY.exec(key)?.[1] ?? null;
}

/** Empreintes des médias cités dans un texte riche, sans doublon. */
export function mediaHashesInHtml(html: string): string[] {
  const found = new Set<string>();
  for (const tag of html.match(IMG_TAG) ?? []) {
    const hash = SRC_ATTRIBUTE.exec(tag)?.[1];
    if (hash) found.add(hash);
  }
  return [...found];
}

function srcsetFor(variants: CmsMediaVariantRow[], format: string): string {
  return variants
    .filter((variant) => variant.format === format)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `/${variant.key.replace(/^\/+/, '')} ${variant.width}w`)
    .join(', ');
}

export function enhanceBodyImages(html: string, variants: CmsMediaVariantRow[]): string {
  if (!html || variants.length === 0) return html;

  const byHash = new Map<string, CmsMediaVariantRow[]>();
  for (const variant of variants) {
    const hash = hashOfKey(variant.key);
    if (!hash) continue;
    const bucket = byHash.get(hash);
    if (bucket) bucket.push(variant);
    else byHash.set(hash, [variant]);
  }

  return html.replace(IMG_TAG, (tag) => {
    const hash = SRC_ATTRIBUTE.exec(tag)?.[1];
    const known = hash ? byHash.get(hash) : undefined;
    if (!known || known.length === 0) return tag;

    /*
     * `sizes` déduit de l'attribut `width`, posé par l'éditeur.
     *
     * Sans lui, le navigateur suppose une image pleine largeur et choisit la plus
     * grande déclinaison — ce qui annulerait très exactement le bénéfice recherché sur
     * une image réduite à 400 px.
     */
    const displayed = Number(WIDTH_ATTRIBUTE.exec(tag)?.[1] ?? 0);
    const sizes = displayed > 0 ? `(max-width: ${displayed}px) 100vw, ${displayed}px` : '100vw';

    const sources = ['avif', 'webp']
      .map((format) => ({ format, srcset: srcsetFor(known, format) }))
      .filter((source) => source.srcset !== '')
      .map(
        (source) =>
          `<source type="image/${source.format}" srcset="${source.srcset}" sizes="${sizes}">`
      )
      .join('');

    return sources === '' ? tag : `<picture>${sources}${tag}</picture>`;
  });
}
