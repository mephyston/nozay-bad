import type { Discipline } from '../shared/ranking';
import type { GetLineupOutput } from '../get-lineup/dto';

export interface SaveLineupSlot {
  discipline: Discipline;
  position: number;
  licence1: string;
  /** `null` en simple. */
  licence2?: string | null;
}

export interface SaveLineupInput {
  teamId: number;
  dayNumber: number;
  slot?: number;
  /**
   * Licence de l'adhérent qui enregistre.
   *
   * Imposée depuis la session par l'espace adhérent, jamais reprise du corps envoyé par
   * le navigateur : c'est elle qui décide du droit d'écrire.
   */
  licence: string;
  lines: SaveLineupSlot[];
  /** Fige la composition et la signale au coach. */
  validate?: boolean;
}

export type SaveLineupOutput = GetLineupOutput;
