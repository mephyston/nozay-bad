import type { OpenPlaySessionRow } from '../../shared/open-play-schema';

export interface ReleaseOpenPlaySessionInput {
  sessionId: number;
  /** Imposée par la session : on ne libère que la séance qu'on tient soi-même. */
  licence: string;
}

export type ReleaseOpenPlaySessionOutput = OpenPlaySessionRow;
