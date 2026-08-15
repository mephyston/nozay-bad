import type { CmsMediaRow } from '../../shared/schema';

export interface UploadMediaInput {
  bytes: ArrayBuffer;
  mimeType: string;
  /** Dimensions mesurées par l'appelant. Obligatoires pour une image. */
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
}

export type UploadMediaOutput = CmsMediaRow;

/** Dépôt dans l'objet-store, injecté pour que le handler reste testable sans R2. */
export interface MediaStore {
  put(key: string, bytes: ArrayBuffer, mimeType: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Réencodage d'une image à une largeur donnée, injecté comme `MediaStore`.
 *
 * En production c'est le binding Images du Worker ; en test, une fonction qui rend
 * quelques octets. Le handler n'a pas à savoir lequel des deux il tient.
 *
 * `format` est un type MIME complet (`image/webp`), celui qu'attend le binding.
 */
export interface ImageTranscoder {
  resize(
    bytes: ArrayBuffer,
    options: { width: number; format: string; quality: number }
  ): Promise<TranscodedImage>;
}

/**
 * Le format **rendu** est renvoyé avec les octets, et n'est pas supposé égal au format
 * demandé.
 *
 * Cloudflare abandonne l'encodage AVIF et retombe sur le WebP quand l'image est grande
 * ou le service chargé — sans erreur, et sans que la bascule soit reproductible d'une
 * largeur à l'autre. Éprouvé contre le compte : une même image rendait de l'AVIF à
 * 1400 px lors d'un passage, du WebP à 1500 px au suivant.
 *
 * Ne pas le vérifier reviendrait à écrire des octets WebP sous une clé `.avif` et à
 * les déclarer `<source type="image/avif">` : le navigateur choisirait cette source
 * puis échouerait à la décoder, ce qui casse l'image au lieu de l'alléger.
 */
export interface TranscodedImage {
  bytes: ArrayBuffer;
  /** Type MIME réellement produit, lu sur la réponse du service. */
  contentType: string;
}
