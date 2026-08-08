import {
  sanitizeRichText as sanitize,
  richTextToPlain as toPlain,
  isRichTextEmpty as isEmpty,
  ANNOUNCEMENT_PROFILE
} from '@nba/html';

/**
 * Texte riche d'une annonce, lié à son profil d'assainissement.
 *
 * Le moteur vit dans `@nba/html` — c'est de la technique pure, partagée avec le site
 * public, qui a besoin d'une liste blanche bien plus large (titres, tableaux, images).
 * Ce fichier fixe le choix propre au domaine : une annonce est un **message**, pas un
 * document. Gras, italique, souligné, listes, un lien, et rien d'autre.
 *
 * Les signatures restent sans paramètre de profil, pour qu'aucun appelant du domaine ne
 * puisse élargir la liste blanche par inadvertance.
 */

export function sanitizeRichText(html: string): string {
  return sanitize(html, ANNOUNCEMENT_PROFILE);
}

export function richTextToPlain(html: string, maxLength: number): string {
  return toPlain(html, maxLength, ANNOUNCEMENT_PROFILE);
}

export function isRichTextEmpty(html: string): boolean {
  return isEmpty(html, ANNOUNCEMENT_PROFILE);
}
