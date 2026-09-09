import type { IndivSessionRow } from '../../shared/indiv-schema';
import type { SlotWindow } from '../../shared/indiv';

export interface ListIndivCandidatesInput {
  sessionId: number;
}

/** Un candidat, tel que l'entraîneur le lit — avec ce que la saison dit de lui. */
export interface IndivCandidate {
  requestId: number;
  memberId: number;
  licence: string;
  firstName: string;
  lastName: string;
  email: string;
  memberGroup: string;
  preferredSlot: number | null;
  note: string | null;
  selectedSlot: number | null;
  /** Horodatage de la demande, en secondes. */
  requestedAt: number;
  /** Candidatures de la licence sur les soirées de la saison, celle-ci comprise. */
  requestCount: number;
  /** Fois retenu cette saison, soirées **annoncées** seulement. */
  selectedCount: number;
  /** Date de la dernière soirée annoncée où la licence a été retenue, ou `null`. */
  lastSelectedDate: string | null;
}

export interface ListIndivCandidatesOutput {
  session: IndivSessionRow & { venueName: string | null; endTime: string; slots: SlotWindow[] };
  candidates: IndivCandidate[];
}
