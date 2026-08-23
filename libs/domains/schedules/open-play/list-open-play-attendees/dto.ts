import type { GuestName } from '../register-to-open-play/dto';

export interface ListOpenPlayAttendeesInput {
  sessionId: number;
}

export interface OpenPlayAttendee {
  firstName: string;
  lastName: string;
  /** Les personnes que cet adhérent amène. */
  guests: GuestName[];
}

export interface ListOpenPlayAttendeesOutput {
  attendees: OpenPlayAttendee[];
  totals: { members: number; guests: number; players: number };
}
