import type { ClubEventRegistrationRow } from '../shared/schema';

export interface RegisterToEventInput {
  eventId: number;
  /**
   * Identité de l'inscrit.
   *
   * Elle est **imposée par l'appelant de confiance** — l'espace adhérent la tire de la
   * session, jamais du corps de la requête du navigateur. C'est ce qui empêche un
   * adhérent d'en inscrire un autre, et la raison pour laquelle ces champs sont ici
   * plutôt que résolus par une lecture de `members` : le domaine ne connaît pas les
   * adhérents, il enregistre qui on lui présente.
   */
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
  /** Accompagnants. Absent vaut « vient seul ». */
  guests?: number;
}

export type RegisterToEventOutput = ClubEventRegistrationRow;
