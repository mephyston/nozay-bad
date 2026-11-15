import type { OpenPlaySessionRow } from '../../shared/open-play-schema';

export interface ClaimOpenPlaySessionInput {
  sessionId: number;
  /**
   * Licence et identité du bénévole, **imposées par l'appelant de confiance**.
   *
   * L'espace adhérent les tire de la session. C'est ce qui rend le contrôle « êtes-vous
   * bénévole ? » incontournable : le navigateur ne peut pas prétendre à une autre licence.
   */
  licence: string;
  firstName: string;
  lastName: string;
}

export type ClaimOpenPlaySessionOutput = OpenPlaySessionRow;
