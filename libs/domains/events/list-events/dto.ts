import type { ClubEventRow } from '../shared/schema';

export interface ListEventsInput {
  /** Par défaut, seuls les événements à venir : c'est ce qu'attend un agenda. */
  includePast?: boolean;
  includeUnpublished?: boolean;
  limit?: number;
  /**
   * Adhérent au nom duquel on lit, s'il y en a un.
   *
   * Renseigné, chaque événement porte en plus l'état de **sa propre** inscription.
   * C'est ce qui permet à l'espace adhérent de rendre le bon bouton sans un second
   * aller-retour par événement.
   */
  memberId?: number;
}

/**
 * Un événement, augmenté de ce que l'agenda a besoin de savoir sur ses inscriptions.
 *
 * Des **compteurs, et aucun nom** : cette route est ouverte aux appelants de service —
 * le site public et l'espace adhérent —, qui n'ont aucune identité. Savoir qu'il y a
 * douze inscrits n'apprend rien sur personne ; savoir lesquels, si.
 */
export interface ClubEventListItem extends ClubEventRow {
  /** Adhérents inscrits. */
  registrationCount: number;
  /** Couverts à prévoir : les inscrits et leurs accompagnants. */
  attendeeCount: number;
  /**
   * Accompagnants annoncés par l'adhérent interrogé, ou `null` s'il n'est pas inscrit.
   * Toujours `null` quand la lecture n'est faite au nom de personne.
   */
  myGuests: number | null;
}

export type ListEventsOutput = ClubEventListItem[];
