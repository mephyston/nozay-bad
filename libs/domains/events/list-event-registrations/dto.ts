export interface ListEventRegistrationsInput {
  eventId: number;
}

export interface EventRegistrationView {
  id: number;
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
  guests: number;
  /** Horodatage de la première inscription, en secondes. */
  registeredAt: number;
}

export interface ListEventRegistrationsOutput {
  registrations: EventRegistrationView[];
  totals: {
    /** Adhérents inscrits. */
    members: number;
    /** Accompagnants annoncés. */
    guests: number;
    /** Couverts à prévoir : les deux réunis. C'est le seul chiffre qui sert vraiment. */
    people: number;
  };
}
