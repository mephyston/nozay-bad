import type { GetLineupOutput } from '../get-lineup/dto';

export interface NotifyLineupInput {
  team: { id: number; seasonCode: string };
  lineup: GetLineupOutput;
  /** Licence de celui qui vient d'enregistrer : il sait déjà, on ne le prévient pas. */
  authorLicence: string;
  /** La composition est-elle figée par le capitaine, ou encore susceptible de bouger ? */
  validated: boolean;
}

export interface NotifyLineupOutput {
  /** Joueurs alignés prévenus. */
  selected: number;
  /** Joueurs de l'effectif non retenus, prévenus eux aussi. */
  benched: number;
}
