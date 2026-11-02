import type { GetLineupOutput } from '../get-lineup/dto';

export interface NotifyLineupInput {
  team: { id: number; seasonCode: string };
  lineup: GetLineupOutput;
  /** Licence de celui qui vient d'enregistrer : il sait déjà, on ne le prévient pas. */
  authorLicence: string;
  /**
   * Ce qui vient d'arriver à la composition.
   *
   * `published` : le capitaine la publie. `updated` : il retouche une composition déjà
   * publiée. `withdrawn` : il la repasse en brouillon, elle n'est plus visible de l'équipe.
   */
  kind: 'published' | 'updated' | 'withdrawn';
  /**
   * Licences alignées **avant** l'écriture. Un retrait prévient ceux qui avaient été
   * prévenus : l'effectif, plus un joueur aligné hors effectif s'il y en avait un.
   */
  previouslySelected?: string[];
}

export interface NotifyLineupOutput {
  /** Joueurs alignés prévenus. */
  selected: number;
  /** Joueurs de l'effectif non retenus, prévenus eux aussi. */
  benched: number;
  /** Retrait : joueurs prévenus que la composition n'est plus d'actualité. */
  withdrawn?: number;
}
