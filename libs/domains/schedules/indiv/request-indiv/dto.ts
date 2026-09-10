import type { IndivRequestRow } from '../../shared/indiv-schema';

export interface RequestIndivInput {
  sessionId: number;
  /**
   * Identité du candidat, **imposée par l'appelant de confiance** — l'espace adhérent la
   * tire de la session, jamais du corps de la requête du navigateur. Le domaine ne
   * connaît pas les adhérents : il enregistre qui on lui présente.
   */
  memberId: number;
  licence: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Libellé du groupe d'adhésion, lui aussi imposé par l'appelant : c'est lui qui ouvre la porte. */
  memberGroup: string;
  /** Créneau souhaité (1-based), absent ou `null` = indifférent. */
  preferredSlot?: number | null;
  note?: string | null;
}

export type RequestIndivOutput = IndivRequestRow;
