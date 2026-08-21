export interface UploadMemberPhotoInput {
  licence: string;
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface UploadMemberPhotoOutput {
  /** Sert de version d'URL côté affichage (`?v=`), la clé R2 n'étant jamais exposée. */
  photoUpdatedAt: number;
}

/**
 * Dépôt dans l'objet-store, injecté pour que le handler reste testable sans R2.
 *
 * `deletePrefix` et non `delete` : un portrait est un préfixe qui porte plusieurs
 * tailles, et les retirer une par une ferait dépendre l'appelant de la liste des
 * tailles produites — laquelle change avec `PHOTO_SIZES`.
 */
export interface PhotoStore {
  put(key: string, bytes: ArrayBuffer, mimeType: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}

/**
 * Réencodage d'une image à une largeur donnée, injecté comme `PhotoStore`.
 *
 * Même contrat que celui de la médiathèque : le type MIME **rendu** est renvoyé avec
 * les octets et n'est pas supposé égal à celui demandé — Cloudflare retombe sur un
 * autre encodage quand le service est chargé. Ici on enregistre ce qui est réellement
 * produit, avec son type : le portrait est servi tel quel, sans négociation de format.
 */
export interface PhotoTranscoder {
  resize(
    bytes: ArrayBuffer,
    options: { width: number; format: string; quality: number }
  ): Promise<{ bytes: ArrayBuffer; contentType: string }>;
}
