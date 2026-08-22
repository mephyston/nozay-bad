import type { OpenPlayRegistrationRow } from '../../shared/open-play-schema';

export interface GuestName {
  firstName: string;
  lastName: string;
}

export interface RegisterToOpenPlayInput {
  sessionId: number;
  /**
   * Identité de l'inscrit, **imposée par l'appelant de confiance**.
   *
   * L'espace adhérent la tire de la session, jamais du corps de la requête du
   * navigateur. C'est ce qui empêche un adhérent d'en inscrire un autre, et la raison
   * pour laquelle ces champs sont ici plutôt que résolus par une lecture de `members` :
   * le domaine ne connaît pas les adhérents, il enregistre qui on lui présente.
   */
  memberId: number;
  licence: string;
  firstName: string;
  lastName: string;
  email: string;
  /**
   * Les invités annoncés, **liste entière**.
   *
   * Elle remplace la précédente : il n'existe pas d'action « ajouter un invité », mais
   * seulement « voici qui je viens avec ». Absente vaut « je viens seul ».
   */
  guests?: GuestName[];
}

export interface RegisterToOpenPlayOutput extends OpenPlayRegistrationRow {
  guests: GuestName[];
}
