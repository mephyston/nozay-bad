import type { ClubFunction } from '../shared/club-functions';

export type { ClubFunction };

export interface ClubFunctionAssignment {
  licence: string;
  function: ClubFunction;
  /**
   * Identité résolue dans le référentiel adhérents de la même saison. `null` quand la
   * licence n'y figure plus (dossier retiré d'un ré-import) : l'attribution est alors
   * affichée « sans dossier » plutôt que masquée — la retirer est une décision humaine.
   */
  memberId: number | null;
  firstName: string | null;
  lastName: string | null;
  /**
   * Version du portrait, jointe depuis l'annuaire de la saison ; `null` sans photo.
   *
   * L'API des fonctions ne la rend pas : le relais la recopie depuis la liste des
   * adhérents qu'il charge déjà, plutôt que d'ouvrir une seconde source.
   */
  photoUpdatedAt?: string | number | null;
}

export interface ClubFunctionsStatus {
  /** Saison en cours résolue par la date ; `null` hors de toute saison connue. */
  seasonCode: string | null;
  /** Nombre de fonctions attribuées sur cette saison. */
  defined: number;
  /**
   * Fonctions indispensables (président, trésorier) sans titulaire sur la saison.
   * Non vide = action à réaliser, signalée sur l'entrée de menu « Dirigeants ».
   */
  missing: ClubFunction[];
}
