import { decodeEntities } from './entities';
import { sanitizeRichText } from './sanitize';
import { ANNOUNCEMENT_PROFILE, type SanitizeProfile } from './profile';

/**
 * Balises dont la fermeture sépare deux blocs de texte.
 *
 * Sans cette étape, « …fin</li><li>Début… » se recollerait en « finDébut ». La liste
 * couvre les deux profils : une balise absente du texte assaini ne coûte rien.
 */
const BLOCK_CLOSERS =
  /<\/(p|li|ul|ol|h2|h3|h4|blockquote|figure|figcaption|table|thead|tbody|tr|th|td)\s*>/gi;

/** Balises orphelines valant elles aussi une césure. */
const VOID_SEPARATORS = /<(br|hr)>/gi;

/**
 * Version texte brut, pour le corps d'une notification push ou une meta description.
 *
 * `sendNotificationSchema` plafonne le corps à 300 caractères : on tronque sur un mot
 * entier plutôt qu'au milieu, et on signale la coupe par une ellipse.
 */
export function richTextToPlain(
  html: string,
  maxLength: number,
  profile: SanitizeProfile = ANNOUNCEMENT_PROFILE
): string {
  if (!html) return '';

  // On repart du HTML assaini : le balayage y a déjà écarté les sous-arbres dangereux
  // et redressé l'imbrication, ce qu'un simple retrait de balises ferait mal.
  const text = decodeEntities(
    sanitizeRichText(html, profile)
      .replace(BLOCK_CLOSERS, ' ')
      .replace(VOID_SEPARATORS, ' ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}…`;
}

/** Vrai si le contenu ne porte aucun texte visible (que du balisage ou des espaces). */
export function isRichTextEmpty(html: string, profile: SanitizeProfile = ANNOUNCEMENT_PROFILE): boolean {
  return richTextToPlain(html, Number.MAX_SAFE_INTEGER, profile).length === 0;
}
