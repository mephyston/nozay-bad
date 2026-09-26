import type { OpenPlayStatus } from '../../shared/open-play-schema';

export interface ListPublicOpenPlayInput {
  /** Nombre de séances à venir. Borné par le handler. */
  limit?: number;
  /**
   * Dernier jour retenu, « 2026-03-29 », bornes comprises.
   *
   * C'est ce que lit le site pour afficher des **semaines** entières : le nombre de
   * séances d'une semaine n'est pas connu d'avance, une limite couperait un dimanche.
   */
  to?: string;
}

/**
 * Une séance telle que le site public la montre.
 *
 * Une projection **fermée** et non un `OpenPlaySessionRow` enrichi : la ligne porte la
 * licence de l'ouvreur, les consignes du bureau (« clé chez Robert ») et le motif
 * d'annulation, qui n'ont rien à faire sur une page indexée. Ajouter un champ ici est
 * un choix, jamais l'effet de bord d'une colonne ajoutée en base.
 */
export interface PublicOpenPlaySession {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  status: OpenPlayStatus;
  venueName: string | null;
  minPlayers: number;
  /** Adhérents et invités : le chiffre du seuil. */
  playerCount: number;
  /** Invités annoncés — comptés, jamais nommés sur le site public. */
  guestCount: number;
  /** Les adhérents inscrits, « Camille D. », dans l'ordre d'inscription. */
  players: string[];
  /** L'ouvreur, « Robert M. », ou `null` tant que personne n'a pris la séance. */
  opener: string | null;
}

export interface ListPublicOpenPlayOutput {
  sessions: PublicOpenPlaySession[];
}
