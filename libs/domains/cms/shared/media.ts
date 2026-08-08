/**
 * Conventions de la médiathèque.
 *
 * Les clés R2 portent l'empreinte du contenu : un fichier donné a une clé et une
 * seule, et ce qu'il y a derrière une clé ne change jamais. C'est ce qui autorise un
 * cache immuable d'un an sur la route qui les sert, et c'est aussi ce qui déduplique
 * l'import — réimporter deux fois la même photo n'occupe qu'une place.
 */

/** Largeurs produites à l'import. Au-delà de 1600 px, l'écran d'un adhérent n'en tire rien. */
export const VARIANT_WIDTHS = [400, 800, 1200, 1600] as const;

/** Formats servis, du plus efficace au repli universel. */
export const VARIANT_FORMATS = ['avif', 'webp'] as const;

export const MEDIA_KEY_PREFIX = 'media/';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf'
};

export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? 'bin';
}

/** Types acceptés. Liste fermée : tout le reste est refusé, y compris les SVG. */
export function isAllowedMediaType(mimeType: string): boolean {
  // Un SVG est un document exécutable : il peut porter du script. Le refuser coûte
  // moins cher que de l'assainir, et le club n'en dépose pas.
  return Object.hasOwn(EXTENSIONS, mimeType);
}

export function originalKey(contentHash: string, mimeType: string): string {
  return `${MEDIA_KEY_PREFIX}${contentHash}/original.${extensionFor(mimeType)}`;
}

export function variantKey(contentHash: string, width: number, format: string): string {
  return `${MEDIA_KEY_PREFIX}${contentHash}/${width}.${format}`;
}

/** Empreinte SHA-256 tronquée : 16 caractères hexadécimaux suffisent largement ici. */
export async function contentHashOf(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/**
 * Une clé de média est-elle bien formée ?
 *
 * La route publique concatène ce que porte l'URL : sans ce contrôle, un `..` ouvrirait
 * la lecture d'objets hors de la médiathèque.
 */
export function isSafeMediaKey(key: string): boolean {
  return /^[a-f0-9]{16}\/[a-z0-9._-]{1,64}$/.test(key);
}
