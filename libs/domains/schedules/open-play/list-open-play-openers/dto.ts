import type { OpenPlayOpenerRow } from '../../shared/open-play-schema';

export interface ListOpenPlayOpenersInput {
  seasonCode: string;
}

export interface OpenPlayOpenerView extends OpenPlayOpenerRow {
  /** Séances que cette personne a ouvertes sur la saison. Utile pour voir qui porte tout. */
  sessionsOpened: number;
}

export type ListOpenPlayOpenersOutput = OpenPlayOpenerView[];
