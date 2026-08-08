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
