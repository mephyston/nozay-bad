import { PIECES_MAX, typeDePiece } from './justificatif';
export type { PieceResume } from './justificatif';
import { InvalidAttachmentError } from './errors';

/** Une pièce prête à écrire : son contenu et le type qu'on en a tiré. */
export interface PieceAEcrire {
  dataUrl: string;
  mediaType: string;
}

/**
 * Les pièces reçues, contrôlées : cinq au plus, chacune photo ou PDF.
 *
 * Le validateur borne déjà le nombre ; le type, lui, ne se lit qu'au contenu. Une adresse
 * qui ne serait ni l'un ni l'autre finirait dans un `<img src>` de l'admin.
 */
export function verifierPieces(adresses: string[]): PieceAEcrire[] {
  if (adresses.length > PIECES_MAX) {
    throw new InvalidAttachmentError(`Une note de frais porte ${PIECES_MAX} pièces jointes au plus.`);
  }
  return adresses.map((dataUrl, i) => {
    const mediaType = typeDePiece(dataUrl);
    if (!mediaType) throw new InvalidAttachmentError(`La pièce n° ${i + 1} n'est ni une photo ni un PDF.`);
    return { dataUrl, mediaType };
  });
}
