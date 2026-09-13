/**
 * Les images du club dans R2.
 *
 * Même rangement que la médiathèque du site : une clé `media/<empreinte>/<nom>.<ext>`
 * adressée par le contenu, servie par le site public sous `/media/<empreinte>/<nom>.<ext>`
 * avec un cache immuable d'un an. Remplacer une image donne une nouvelle clé, donc
 * une nouvelle adresse — rien à invalider, ni dans le navigateur ni au bord.
 *
 * Les helpers sont recopiés de `cms/shared/media.ts` plutôt qu'importés : le domaine
 * club ne dépend de personne, et deux fonctions de dix lignes ne valent pas une
 * dépendance entre domaines.
 */

export const CLUB_MEDIA_PREFIX = 'media/';

/** PNG ou JPEG seulement : ce sont les deux formats que `pdf-lib` sait embarquer. */
export const CLUB_ASSET_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
export type ClubAssetMimeType = (typeof CLUB_ASSET_MIME_TYPES)[number];

/** Une bande d'en-tête à fond perdu en 300 dpi tient largement là-dedans. */
export const MAX_CLUB_ASSET_BYTES = 2 * 1024 * 1024;

/**
 * Le format se lit dans les octets, jamais dans l'extension ou le `Content-Type`
 * annoncés : c'est ce que `pdf-lib` regardera, et un JPEG renommé `.png` casserait
 * la génération de tous les documents.
 */
export function sniffImageType(bytes: ArrayBuffer): ClubAssetMimeType | null {
  const b = new Uint8Array(bytes.slice(0, 8));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  return null;
}

export async function contentHashOf(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function clubAssetKey(hash: string, name: string, mimeType: ClubAssetMimeType): string {
  return `${CLUB_MEDIA_PREFIX}${hash}/${name}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;
}

/** Chemin public d'une clé, tel que le site le sert (`/media/<empreinte>/<nom>.<ext>`). */
export function clubAssetPath(key: string): string {
  return `/media/${key.replace(/^media\//, '')}`;
}

/** Ce que le handler attend de R2 — le port, pour que le test n'ait pas de bucket. */
export interface ClubAssetStore {
  has(key: string): Promise<boolean>;
  put(key: string, bytes: ArrayBuffer, mimeType: string): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
}

export function r2ClubAssetStore(bucket: R2Bucket): ClubAssetStore {
  return {
    async has(key) {
      return (await bucket.head(key)) !== null;
    },
    async put(key, bytes, mimeType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    },
    async get(key) {
      const object = await bucket.get(key);
      return object ? object.arrayBuffer() : null;
    }
  };
}
