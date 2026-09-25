export interface ListEventAttendeesInput {
  eventId: number;
}

export interface EventAttendee {
  firstName: string;
  lastName: string;
  /** Accompagnants annoncés : un nombre, l'inscription ne les nomme pas. */
  guests: number;
}

export interface ListEventAttendeesOutput {
  attendees: EventAttendee[];
  totals: { members: number; guests: number; people: number };
}
