import type { OpenPlaySessionRow, OpenPlayStatus } from '../../shared/open-play-schema';

/**
 * Tous les champs sont optionnels : **absent = ne rien changer**, convention des autres
 * mises à jour du dépôt. `openerLicence: null` retire explicitement l'ouvreur.
 */
export interface UpdateOpenPlaySessionInput {
  sessionId: number;
  date?: string;
  venueId?: number;
  startTime?: string;
  endTime?: string;
  minPlayers?: number;
  label?: string | null;
  notes?: string | null;
  status?: OpenPlayStatus;
  cancelledReason?: string | null;
  /** Désignation manuelle par le bureau : le bénévole a dit oui par SMS. */
  openerLicence?: string | null;
  openerFirstName?: string | null;
  openerLastName?: string | null;
}

export type UpdateOpenPlaySessionOutput = OpenPlaySessionRow;
