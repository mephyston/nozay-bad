import type { Championship } from '../shared/championship';

export interface SaveTeamInput {
  /** Absent : création. Présent : modification de cette équipe. */
  id?: number;
  seasonCode: string;
  championship: Championship;
  division: string;
  /** Le rang dans le club. C'est lui que lit la règle de hiérarchie des valeurs. */
  number: number;
  poolLabel?: string | null;
  active?: boolean;
}

export interface SaveTeamOutput {
  id: number;
  /** Dérivé du numéro : `NBA91-3`. Jamais stocké, jamais saisi. */
  name: string;
}
