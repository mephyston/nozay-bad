import type { PhotoSize } from '../shared/photo';

export interface GetMemberPhotoInput {
  licence: string;
  size: PhotoSize;
}

export interface GetMemberPhotoOutput {
  /**
   * Clés à essayer dans l'ordre : la taille demandée, puis les replis.
   *
   * Une vignette peut manquer — quota Images épuisé au dépôt, binding absent en
   * développement — sans que le portrait, lui, manque. Servir la grande taille est
   * préférable à une pastille vide, et l'écart de poids reste marginal.
   */
  keys: string[];
  /** Sert d'`ETag` : deux photos différentes ne partagent jamais leur horodatage. */
  photoUpdatedAt: number | null;
}
