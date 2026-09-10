import type { IndivRequestRow, IndivSessionRow } from '../../shared/indiv-schema';

export interface AnnounceIndivInput {
  sessionId: number;
}

export interface AnnounceIndivOutput {
  session: IndivSessionRow;
  selected: IndivRequestRow[];
  declined: IndivRequestRow[];
  /** Vrai quand la soirée avait déjà été annoncée : l'appelant prévient d'une mise à jour. */
  reannounced: boolean;
}
