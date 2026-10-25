/**
 * Le justificatif d'une note de frais : une adresse `data:` stockée telle quelle en base.
 *
 * Une photo (WebP ou JPEG, compressée dans le navigateur) ou un PDF (envoyé tel quel :
 * une facture reçue par courriel n'a pas à être photographiée sur un écran).
 */

/** Ce que la liste dit d'une pièce : de quoi l'ouvrir, sans son contenu. */
export interface PieceResume {
  id: number;
  mediaType: string;
}

/**
 * Une pièce dans un formulaire : déjà jointe (`id`, contenu pas encore lu) ou tout juste
 * choisie (`dataUrl`, pas encore d'identifiant).
 */
export interface PieceJointe {
  id?: number;
  mediaType: string;
  dataUrl?: string;
  nom?: string;
}

/** Cinq pièces par note : un déplacement (péage, carburant, repas…) tient dans une note. */
export const PIECES_MAX = 5;

/** Ce qu'une pièce peut être : une photo ou un PDF. Le reste n'a rien d'un justificatif. */
export const TYPES_DE_PIECE = /^data:(image\/[a-z0-9.+-]+|application\/pdf)[;,]/i;

/**
 * Le type d'une pièce, tiré de son adresse `data:` (« image/webp », « application/pdf »).
 * `null` pour ce qui n'est ni une photo ni un PDF.
 */
export function typeDePiece(adresse: string): string | null {
  const trouve = TYPES_DE_PIECE.exec(adresse);
  return trouve ? trouve[1].toLowerCase() : null;
}

export function estJustificatifPdf(adresse: string | null | undefined): boolean {
  return !!adresse && adresse.startsWith('data:application/pdf');
}

/** La même question, pour une pièce dont on n'a que le type (la liste ne lit pas le contenu). */
export const estTypePdf = (type: string | null | undefined) => type === 'application/pdf';

/**
 * Le PDF en `Blob`, pour l'ouvrir dans un onglet : la CSP de l'admin interdit de le
 * cadrer (`object-src 'none'`, pas de `frame-src`), et un navigateur refuse d'ouvrir
 * une adresse `data:` en navigation de premier niveau.
 */
export function justificatifEnBlob(adresse: string): Blob {
  const virgule = adresse.indexOf(',');
  const binaire = atob(adresse.slice(virgule + 1));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: 'application/pdf' });
}
