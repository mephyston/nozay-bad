export interface CreateCheckInput {
  seasonId: string;
  number: string;
  amount: number;
  emitter: string;
  bank?: string;
  memberId?: number;
  category?: string | number;
  description?: string;
  date?: string;
  photoUrl?: string;
}

/**
 * Ce qu'une photo de chèque a livré, prêt à préremplir le formulaire.
 *
 * `amount` est en **centimes**, comme partout dans le domaine : l'écran divisait déjà par
 * cent, et recevait des euros — un chèque de 150 € s'affichait « 1.5 ». Un champ vide
 * (`''`, `0`, `null`) veut dire « non lu » : l'écran le laisse à la main.
 */
export interface AnalyzeCheckOutput {
  number: string;
  amount: number;
  emitter: string;
  bank: string;
  memberId: number | null;
  memberName: string | null;
  date: string | null;
}

export interface UpdateCheckInput {
  number: string;
  amount: number;
  emitter: string;
  bank?: string | null;
  memberId?: number | null;
  category?: string | number;
  date: string;
}
