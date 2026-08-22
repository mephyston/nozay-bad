import type { OpenPlayOpenerRow } from '../../shared/open-play-schema';

export interface SaveOpenPlayOpenerInput {
  seasonCode: string;
  /** Licence de l'adhérent à qui le bureau confie un badge. */
  licence: string;
}

export type SaveOpenPlayOpenerOutput = OpenPlayOpenerRow;
