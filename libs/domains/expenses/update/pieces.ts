import { PIECES_MAX } from '../shared/justificatif';
import { InvalidAttachmentError } from '../shared/errors';
import { verifierPieces, type PieceAEcrire } from '../shared/pieces';

/** Une pièce dans la liste voulue : une pièce déjà jointe, ou une nouvelle. */
export type PieceDemandee = { id: number } | { dataUrl: string };

/** Ce que l'enregistrement doit écrire pour passer des pièces jointes à celles voulues. */
export interface PlanDePieces {
  retirees: number[];
  /** Les pièces gardées, avec leur nouvelle place. */
  gardees: { id: number; position: number }[];
  ajoutees: (PieceAEcrire & { position: number })[];
}

/**
 * De la liste voulue, dans l'ordre, au plan d'écriture.
 *
 * La liste envoyée est la liste entière : ce qui n'y figure plus est retiré. Une pièce
 * déjà jointe ne revient que par son identifiant — quelques centaines de Ko qu'on ne
 * renvoie pas pour rien —, et doit appartenir à cette note.
 */
export function planifierPieces(existantes: number[], demandees: PieceDemandee[]): PlanDePieces {
  if (demandees.length === 0) throw new InvalidAttachmentError('Une note de frais garde au moins un justificatif.');
  if (demandees.length > PIECES_MAX) {
    throw new InvalidAttachmentError(`Une note de frais porte ${PIECES_MAX} pièces jointes au plus.`);
  }

  const connues = new Set(existantes);
  const gardees: PlanDePieces['gardees'] = [];
  const nouvelles: { dataUrl: string; position: number }[] = [];
  demandees.forEach((piece, position) => {
    if ('id' in piece) {
      if (!connues.has(piece.id)) throw new InvalidAttachmentError('Pièce jointe inconnue pour cette note.');
      if (gardees.some((g) => g.id === piece.id)) throw new InvalidAttachmentError('Pièce jointe en double.');
      gardees.push({ id: piece.id, position });
    } else {
      nouvelles.push({ dataUrl: piece.dataUrl, position });
    }
  });

  const verifiees = verifierPieces(nouvelles.map((n) => n.dataUrl));
  return {
    retirees: existantes.filter((id) => !gardees.some((g) => g.id === id)),
    gardees,
    ajoutees: verifiees.map((piece, i) => ({ ...piece, position: nouvelles[i].position }))
  };
}
