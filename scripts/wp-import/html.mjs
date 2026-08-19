/**
 * Remise en forme du HTML d'éditeur classique.
 *
 * WordPress applique `wpautop` **au rendu**, pas au stockage : le contenu exporté
 * porte des paragraphes en simples sauts de ligne. Sur ce site, 84 des 90 articles
 * longs n'ont aucune balise `<p>`. Les assainir tels quels donnerait un pavé unique,
 * puisque l'assainisseur ne voit que des espaces.
 */

/** Éléments qui portent déjà leur propre mise en forme : on ne les enveloppe pas. */
const BLOCKS =
  'address|article|aside|blockquote|div|dl|figure|figcaption|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|ul';
const OPENS_BLOCK = new RegExp(`^\\s*<(${BLOCKS})[\\s>/]`, 'i');

export function wpautop(input) {
  if (!input) return '';

  const normalised = input
    .replace(/\r\n?/g, '\n')
    // `<br>` en fin de ligne fait double emploi avec la césure qui suit.
    .replace(/<br\s*\/?>\s*\n/gi, '\n');

  return normalised
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => {
      if (!chunk) return false;
      // Un paragraphe réduit à une espace insécable est un artefact de l'éditeur.
      return chunk.replace(/&nbsp;|\s/g, '') !== '';
    })
    .map((chunk) => {
      if (OPENS_BLOCK.test(chunk)) return chunk;
      // Saut simple à l'intérieur d'un paragraphe : césure, pas nouveau paragraphe.
      return `<p>${chunk.replace(/\n/g, '<br>')}</p>`;
    })
    // Concaténation sans séparateur : un saut de ligne entre deux blocs ne veut rien
    // dire en HTML, mais il coupe en deux toute instruction SQL qui le contient.
    .join('');
}

/**
 * Réécrit les images vers la médiathèque, et retire celles qu'on n'a pas reprises.
 *
 * Une image absente du manifeste n'a pas été transcodée : la laisser pointer vers
 * l'ancien hébergement ferait dépendre le nouveau site de WordPress, que l'on veut
 * précisément éteindre.
 */
export function rewriteImages(html, mediaBySource) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return '';
    const relative = decodeURIComponent(
      (src.match(/wp-content\/uploads\/(.+)$/) ?? [])[1] ?? ''
    ).replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');

    const media = mediaBySource.get(relative);
    if (!media || !media.width) return '';

    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    // `width` et `height` viennent du fichier réel : ce sont eux qui réservent la
    // place et suppriment le décalage de mise en page.
    return `<img src="/${media.key}" alt="${alt.replace(/"/g, '&quot;')}" width="${media.width}" height="${media.height}">`;
  });
}

/**
 * Neutralise les codes courts.
 *
 * Ils dépendent de greffons qui ne seront pas repris. Les laisser afficherait
 * « [advanced_iframe src=…] » en clair au milieu du texte ; les convertir demanderait
 * de deviner l'intention. On les retire, et on les signale pour reprise à la main.
 */
export function stripShortcodes(html) {
  const found = new Set();
  const cleaned = html
    .replace(/\[(\/?[a-z_][a-z0-9_-]*)(\s[^\]]*)?\]/gi, (match, name) => {
      found.add(name.replace(/^\//, ''));
      return '';
    });
  return { html: cleaned, shortcodes: [...found] };
}

/**
 * Réécrit les liens vers des fichiers de l'ancien hébergement.
 *
 * Les images n'étaient qu'une partie du problème : les articles pointent aussi une
 * trentaine de PDF — protocoles, convocations d'assemblée, livret d'accueil. Laisser
 * ces liens vers `nozaybad.fr/wp-content/` ferait dépendre le nouveau site du WordPress
 * qu'on veut éteindre.
 *
 * Un fichier absent du manifeste — `.docx`, `.pptx`, que l'on ne reprend pas — voit son
 * lien retiré et son libellé conservé, et le cas est signalé pour reprise.
 */
export function rewriteLinks(html, mediaBySource) {
  const orphans = [];
  const rewritten = html.replace(/<a\b([^>]*)>/gi, (tag, attrs) => {
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || !/wp-content\/uploads\//.test(href)) return tag;

    const relative = decodeURIComponent(
      (href.match(/wp-content\/uploads\/([^?#]+)/) ?? [])[1] ?? ''
    ).replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');

    const media = mediaBySource.get(relative);
    if (!media) {
      orphans.push(relative);
      // Le lien saute, le libellé reste : l'assainisseur déballe la balise ouvrante
      // orpheline, et la phrase demeure lisible.
      return '';
    }
    return tag.replace(href, `/${media.key}`);
  });
  return { html: rewritten, orphans };
}
