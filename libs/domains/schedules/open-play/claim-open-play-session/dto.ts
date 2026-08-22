import type { OpenPlaySessionRow } from '../../shared/open-play-schema';

export interface ClaimOpenPlaySessionInput {
  sessionId: number;
  /**
   * Licence et identité de l'ouvreur, **imposées par l'appelant de confiance**.
   *
   * L'espace adhérent les tire de la session. C'est ce qui rend le contrôle « êtes-vous
   * ouvreur ? » incontournable : le navigateur ne peut pas prétendre à une autre licence.
   */
  licence: string;
  firstName: string;
  lastName: string;
}

export type ClaimOpenPlaySessionOutput = OpenPlaySessionRow;
