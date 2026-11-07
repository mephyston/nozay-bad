export interface GeneratedPaperCard {
  id: number;
  /** Rendu une seule fois, pour l'impression : seule son empreinte reste en base. */
  code: string;
  faceValueCents: number;
}

export interface PaperCardView {
  id: number;
  label: string;
  faceValueCents: number;
  balanceCents: number;
  status: 'new' | 'active' | 'closed';
  closedReason: string | null;
}
