import type { GuestName } from '../register-to-open-play/dto';

export interface ListOpenPlayRegistrationsInput {
  sessionId: number;
}

export interface OpenPlayRegistrationView {
  id: number;
  memberId: number;
  licence: string;
  firstName: string;
  lastName: string;
  email: string;
  guests: GuestName[];
  /** Horodatage en secondes, comme partout dans les vues du dépôt. */
  registeredAt: number;
}

export interface ListOpenPlayRegistrationsOutput {
  registrations: OpenPlayRegistrationView[];
  totals: {
    /** Adhérents inscrits. */
    members: number;
    guests: number;
    /** Le chiffre sur lequel un bénévole décide de se déplacer. */
    players: number;
  };
}
