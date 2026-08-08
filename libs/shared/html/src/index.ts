/**
 * Assainissement HTML sans DOM, pour les Workers Cloudflare.
 *
 * Technique pur : aucune règle métier, aucun catalogue de valeurs fonctionnel. Les
 * profils décrivent ce qu'un éditeur donné a le droit de produire, pas ce que le club
 * a le droit de dire.
 */

export { sanitizeRichText } from './sanitize';
export { richTextToPlain, isRichTextEmpty } from './plain-text';
export { ANNOUNCEMENT_PROFILE, CMS_PROFILE } from './profile';
export type { SanitizeProfile, TagSpec, AttributeSpec } from './profile';
export { decodeEntities, escapeText, escapeAttribute, isSafeHref, isSameOriginPath } from './entities';
