/**
 * Conventions du portrait d'adhérent : formats acceptés, tailles servies, clés R2.
 *
 * Volontairement écrit ici plutôt qu'emprunté à `cms/shared/media.ts` : `members` ne
 * dépend pas de `cms` (frontières de modules), et les deux besoins divergent — la
 * médiathèque accepte les PDF et produit quatre largeurs en deux formats, un portrait
 * n'est qu'une image, carrée, en deux tailles.
 */

/** Préfixe R2 des portraits. */
export const PHOTO_KEY_PREFIX = 'member-photos/';

/**
 * 2 Mio. Le client réencode déjà en WebP 512 px avant d'envoyer (quelques dizaines de
 * Ko) : ce plafond ne vise que les dépôts qui contournent cette préparation.
 */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Ni GIF ni PDF, contrairement à la médiathèque : un portrait n'est pas un document,
 * et une animation n'a rien à faire dans une pastille de 40 px. Le SVG est refusé pour
 * la même raison qu'ailleurs — c'est un document exécutable.
 */
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export function isAllowedPhotoType(mimeType: string): boolean {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Deux tailles seulement : 512 pour la fiche, 128 pour les pastilles des effectifs et
 * des en-têtes. Deux transformations Images par dépôt, là où la médiathèque en consomme
 * huit — on reste très loin des 5 000 par mois de l'offre gratuite.
 */
export const PHOTO_SIZES = [512, 128] as const;
export type PhotoSize = (typeof PHOTO_SIZES)[number];

export const DEFAULT_PHOTO_SIZE: PhotoSize = 512;

export function isPhotoSize(value: number): value is PhotoSize {
  return (PHOTO_SIZES as readonly number[]).includes(value);
}

/** Empreinte SHA-256 tronquée à 16 caractères, comme la médiathèque. */
export async function photoHashOf(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/** Préfixe d'un portrait, tel qu'enregistré dans `member_profiles.photo_key`. */
export function photoPrefix(contentHash: string): string {
  return `${PHOTO_KEY_PREFIX}${contentHash}`;
}

/**
 * Clé d'un objet R2, sans extension : le type réel est porté par les métadonnées R2.
 *
 * Sans extension parce que le transcodage peut ne pas aboutir (binding Images absent en
 * développement, quota épuisé) et que l'original est alors déposé tel quel : une clé
 * `.webp` annoncerait un contenu qui n'en est pas un.
 */
export function photoObjectKey(prefix: string, size: PhotoSize): string {
  return `${prefix}/${size}`;
}
