import { decodeEntities, escapeAttribute, escapeText, isSafeHref } from './html-entities';

/**
 * Assainissement du texte riche d'une annonce.
 *
 * L'éditeur de l'administration produit du HTML dans le navigateur : une source qui
 * n'est **jamais** digne de foi, quel que soit le soin apporté à l'interface. C'est
 * donc l'API qui fait autorité, en ne conservant qu'une liste blanche de balises.
 *
 * Analyse par balayage de la chaîne plutôt que par `DOMParser` : le code s'exécute dans
 * un Worker Cloudflare, qui n'a pas de DOM.
 */

/** Balises conservées telles quelles. Tout le reste est déballé ou supprimé. */
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']);

/** Balises sans contenu ni fermeture. */
const VOID_TAGS = new Set(['br']);

/**
 * Équivalences produites par `document.execCommand`, qui émet encore l'ancien balisage
 * de présentation. On les ramène au balisage sémantique plutôt que de les rejeter.
 */
const TAG_ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
  div: 'p'
};

/**
 * Balises dont le **contenu** doit disparaître avec elles.
 *
 * Déballer un `<script>` recracherait son code en texte visible ; pire, déballer un
 * `<style>` ou un `<svg>` laisserait passer des fragments réinterprétables.
 *
 * Le saut de ces sous-arbres se fait pendant le balayage, et non par un remplacement
 * préalable sur la chaîne : un `<script>` apparaissant **dans une valeur d'attribut**
 * (`<a href="data:text/html,<script>">`) tronquerait sinon tout le reste du document,
 * là où un navigateur lit simplement un attribut contenant du texte.
 */
const STRIPPED_SUBTREES = new Set(['script', 'style', 'iframe', 'noscript', 'template', 'svg', 'math']);

const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const HREF_PATTERN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/** Retire commentaires et déclarations, qui ne portent jamais de contenu utile. */
function stripCommentsAndDeclarations(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<![\s\S]*?>/g, '');
}

/** Extrait un `href` sûr d'une chaîne d'attributs, ou `null` si rien d'acceptable. */
function safeHrefFrom(attributes: string): string | null {
  const match = HREF_PATTERN.exec(attributes);
  if (!match) return null;
  const raw = match[1] ?? match[2] ?? match[3] ?? '';
  if (!raw || !isSafeHref(raw)) return null;
  return escapeAttribute(decodeEntities(raw).trim());
}

/**
 * Ne conserve que le balisage autorisé, et rend le résultat correctement imbriqué.
 *
 * Une balise inconnue est **déballée** : son contenu textuel est conservé, seule la
 * balise disparaît. Coller depuis un traitement de texte donne ainsi le texte, débarrassé
 * de ses `<span style="...">`, plutôt qu'un contenu vide.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';

  const source = stripCommentsAndDeclarations(html);
  const open: string[] = [];
  let out = '';
  let cursor = 0;
  /** Balise de sous-arbre en cours de saut, et sa profondeur d'imbrication. */
  let skipped = '';
  let skippedDepth = 0;

  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_PATTERN.exec(source)) !== null) {
    const text = source.slice(cursor, match.index);
    cursor = TAG_PATTERN.lastIndex;

    const closing = match[1] === '/';
    const rawName = match[2].toLowerCase();

    if (skipped !== '') {
      // Contenu d'un sous-arbre écarté : ni le texte, ni les balises ne ressortent.
      if (rawName === skipped) {
        if (closing) skippedDepth -= 1;
        else skippedDepth += 1;
        if (skippedDepth === 0) skipped = '';
      }
      continue;
    }

    out += escapeText(text);

    if (STRIPPED_SUBTREES.has(rawName)) {
      // Une fermeture orpheline (`</script>` seul) n'ouvre évidemment aucun saut.
      if (!closing) {
        skipped = rawName;
        skippedDepth = 1;
      }
      continue;
    }

    const name = TAG_ALIASES[rawName] ?? rawName;

    if (!ALLOWED_TAGS.has(name)) continue; // déballage : la balise saute, le contenu reste

    if (VOID_TAGS.has(name)) {
      if (!closing) out += `<${name}>`;
      continue;
    }

    if (closing) {
      // Fermeture orpheline ou croisée : on l'ignore plutôt que de casser l'imbrication.
      const depth = open.lastIndexOf(name);
      if (depth === -1) continue;
      while (open.length > depth) out += `</${open.pop()}>`;
      continue;
    }

    if (name === 'a') {
      const href = safeHrefFrom(match[3]);
      // Lien non conforme : on garde le libellé, on jette le lien.
      if (!href) continue;
      open.push(name);
      out += `<a href="${href}">`;
      continue;
    }

    open.push(name);
    out += `<${name}>`;
  }

  // Un sous-arbre resté ouvert (`<script>` jamais fermé) emporte la fin du document :
  // c'est le comportement sûr, et celui des navigateurs.
  if (skipped === '') out += escapeText(source.slice(cursor));
  while (open.length > 0) out += `</${open.pop()}>`;

  return out.trim();
}

/** Vrai si l'annonce ne contient aucun texte visible (que du balisage ou des espaces). */
export function isRichTextEmpty(html: string): boolean {
  return richTextToPlain(html, Number.MAX_SAFE_INTEGER).length === 0;
}

/**
 * Version texte brut, pour le corps d'une notification push.
 *
 * `sendNotificationSchema` plafonne le corps à 300 caractères : on tronque sur un mot
 * entier plutôt qu'au milieu, et on signale la coupe par une ellipse.
 */
export function richTextToPlain(html: string, maxLength: number): string {
  if (!html) return '';

  // On repart du HTML assaini : le balayage y a déjà écarté les sous-arbres dangereux
  // et redressé l'imbrication, ce qu'un simple retrait de balises ferait mal.
  const text = decodeEntities(
    sanitizeRichText(html)
      // Les séparateurs de blocs deviennent des espaces, sans quoi « ...fin</li><li>Début... »
      // se recollerait en « finDébut ».
      .replace(/<\/(p|li|ul|ol)\s*>/gi, ' ')
      .replace(/<br>/gi, ' ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}…`;
}
