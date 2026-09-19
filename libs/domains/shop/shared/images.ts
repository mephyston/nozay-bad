/**
 * L'image d'un produit dans R2.
 *
 * Même rangement que la médiathèque du site et les images du club : une clé
 * `media/<empreinte>/<nom>.<ext>` adressée par le contenu, servie par le site public
 * sous `/media/<empreinte>/<nom>.<ext>` avec un cache immuable d'un an. Remplacer
 * l'image donne une nouvelle clé, donc une nouvelle adresse — rien à invalider.
 *
 * Les helpers sont recopiés de `cms/shared/media.ts` plutôt qu'importés : le domaine
 * boutique ne dépend d'aucun autre, et trois fonctions de dix lignes ne valent pas
 * une dépendance entre domaines.
 */

export const PRODUCT_IMAGE_PREFIX = 'media/';

/** Photo de téléphone non retouchée : 8 Mo laissent passer l'ordinaire sans accepter n'importe quoi. */
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Largeur servie. Une carte de vitrine fait 200 à 400 px de large ; 800 couvre les
 * écrans à haute densité sans peser. Réduite au dépôt, jamais à la volée : une
 * transformation par affichage épuiserait le quota Images de l'offre gratuite.
 */
export const PRODUCT_IMAGE_WIDTH = 800;
export const PRODUCT_IMAGE_FORMAT = 'image/webp';
export const PRODUCT_IMAGE_QUALITY = 80;

export type ProductImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Le format se lit dans les octets, jamais dans l'extension ou le `Content-Type`
 * annoncés : un SVG renommé `.png` est un document exécutable, et c'est ce que le
 * navigateur de l'adhérent recevrait.
 */
export function sniffImageType(bytes: ArrayBuffer): ProductImageMimeType | null {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

export async function contentHashOf(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/**
 * La clé porte la largeur quand l'image a été réduite : l'original déposé tel quel
 * (sans binding Images, en développement) et sa réduction ne se confondent pas.
 */
export function productImageKey(hash: string, mimeType: string, width?: number): string {
  const ext = EXTENSIONS[mimeType] ?? 'bin';
  return `${PRODUCT_IMAGE_PREFIX}${hash}/produit${width ? `-${width}` : ''}.${ext}`;
}

/** Chemin public d'une clé, tel que le site le sert (`/media/<empreinte>/<nom>.<ext>`). */
export function productImagePath(key: string): string {
  return `/media/${key.replace(/^media\//, '')}`;
}

/** Ce que le handler attend de R2 — le port, pour que le test n'ait pas de bucket. */
export interface ProductImageStore {
  has(key: string): Promise<boolean>;
  put(key: string, bytes: ArrayBuffer, mimeType: string): Promise<void>;
}

export interface ProductImageTranscoder {
  resize(bytes: ArrayBuffer, options: { width: number; format: string; quality: number }): Promise<{ bytes: ArrayBuffer; contentType: string }>;
}

export function r2ProductImageStore(bucket: R2Bucket): ProductImageStore {
  return {
    async has(key) {
      return (await bucket.head(key)) !== null;
    },
    async put(key, bytes, mimeType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    }
  };
}

export function productImageTranscoder(images: ImagesBinding): ProductImageTranscoder {
  return {
    async resize(bytes, { width, format, quality }) {
      // `scale-down` et non `cover` : une photo de maillot est en hauteur, un tube de
      // volants en largeur. On réduit sans recadrer ; c'est la carte qui encadre.
      const result = await images
        .input(new Blob([bytes]).stream())
        .transform({ width, height: width, fit: 'scale-down' })
        .output({ format: format as 'image/webp', quality });
      return {
        bytes: await new Response(result.image()).arrayBuffer(),
        contentType: result.contentType()
      };
    }
  };
}
