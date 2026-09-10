import type { IndivSessionRow } from '../../shared/indiv-schema';

/**
 * Tous les champs sont optionnels : **absent = ne rien changer**. `status` n'accepte que
 * `open` et `cancelled` — `announced` ne se pose que par l'annonce elle-même.
 */
export interface UpdateIndivSessionInput {
  sessionId: number;
  date?: string;
  venueId?: number;
  startTime?: string;
  slotCount?: number;
  slotMinutes?: number;
  capacityPerSlot?: number;
  label?: string | null;
  notes?: string | null;
  status?: 'open' | 'cancelled';
  cancelledReason?: string | null;
}

export type UpdateIndivSessionOutput = IndivSessionRow;
