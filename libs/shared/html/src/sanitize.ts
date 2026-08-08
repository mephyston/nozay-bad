import { escapeText } from './entities';
import { ANNOUNCEMENT_PROFILE, type SanitizeProfile, type TagSpec } from './profile';

/**
 * Assainissement du texte riche.
 *
 * Les éditeurs de l'administration produisent du HTML dans le navigateur : une source
 * qui n'est **jamais** digne de foi, quel que soit le soin apporté à l'interface. C'est
 * donc l'API qui fait autorité, en ne conservant qu'une liste blanche de balises et
 * d'attributs — celle du profil choisi par l'appelant (voir `profile.ts`).
 *
 * Analyse par balayage de la chaîne plutôt que par `DOMParser` : le code s'exécute dans
 * un Worker Cloudflare, qui n'a pas de DOM.
 */

const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/**
 * Découpage d'une chaîne d'attributs en paires nom/valeur.
 *
 * Le nom est capturé en entier, ce qui évite le piège d'une recherche par sous-chaîne :
 * `data-href="…"` ne doit pas être lu comme un `href`.
 */
const ATTRIBUTE_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]*)))?/g;

/** Retire commentaires et déclarations, qui ne portent jamais de contenu utile. */
function stripCommentsAndDeclarations(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<![\s\S]*?>/g, '');
}

/** Première occurrence de chaque attribut, nom en minuscules. */
function parseAttributes(raw: string): Record<string, string> {
  const found: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(raw)) !== null) {
    // Une correspondance vide ferait boucler indéfiniment sur la même position.
    if (match[0] === '') {
      ATTRIBUTE_PATTERN.lastIndex += 1;
      continue;
    }
    const name = match[1].toLowerCase();
    if (name in found) continue;
    found[name] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return found;
}

/**
 * Construit la chaîne d'attributs à écrire, ou `null` si la balise doit être déballée.
 *
 * Le déballage est déclenché par un attribut `required` absent ou refusé : un lien
 * sans `href` acceptable garde son libellé et perd son lien, plutôt que de disparaître.
 */
function buildAttributes(spec: TagSpec | undefined, raw: string): string | null {
  if (!spec?.attributes) return '';

  const parsed = parseAttributes(raw);
  const kept: Record<string, string> = {};

  // L'ordre de déclaration est l'ordre d'écriture : la sortie reste stable.
  for (const [name, attribute] of Object.entries(spec.attributes)) {
    const value = Object.hasOwn(parsed, name) ? attribute.sanitize(parsed[name]) : null;
    if (value === null) {
      if (attribute.required) return null;
      continue;
    }
    kept[name] = value;
  }

  const all = { ...kept, ...(spec.derive?.(kept) ?? {}) };
  return Object.entries(all)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('');
}

/**
 * Ne conserve que le balisage autorisé, et rend le résultat correctement imbriqué.
 *
 * Une balise inconnue est **déballée** : son contenu textuel est conservé, seule la
 * balise disparaît. Coller depuis un traitement de texte donne ainsi le texte, débarrassé
 * de ses `<span style="...">`, plutôt qu'un contenu vide.
 */
export function sanitizeRichText(html: string, profile: SanitizeProfile = ANNOUNCEMENT_PROFILE): string {
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

    if (profile.strippedSubtrees.has(rawName)) {
      // Une fermeture orpheline (`</script>` seul) n'ouvre évidemment aucun saut.
      if (!closing) {
        skipped = rawName;
        skippedDepth = 1;
      }
      continue;
    }

    const name = profile.tagAliases[rawName] ?? rawName;

    if (!profile.allowedTags.has(name)) continue; // déballage : la balise saute, le contenu reste

    if (profile.voidTags.has(name)) {
      if (closing) continue;
      const attributes = buildAttributes(profile.tags[name], match[3]);
      // Une image sans source acceptable n'a rien à rendre : elle disparaît en entier.
      if (attributes === null) continue;
      out += `<${name}${attributes}>`;
      continue;
    }

    if (closing) {
      // Fermeture orpheline ou croisée : on l'ignore plutôt que de casser l'imbrication.
      const depth = open.lastIndexOf(name);
      if (depth === -1) continue;
      while (open.length > depth) out += `</${open.pop()}>`;
      continue;
    }

    const attributes = buildAttributes(profile.tags[name], match[3]);
    if (attributes === null) continue; // déballage : lien sans href acceptable, par exemple

    open.push(name);
    out += `<${name}${attributes}>`;
  }

  // Un sous-arbre resté ouvert (`<script>` jamais fermé) emporte la fin du document :
  // c'est le comportement sûr, et celui des navigateurs.
  if (skipped === '') out += escapeText(source.slice(cursor));
  while (open.length > 0) out += `</${open.pop()}>`;

  return out.trim();
}
