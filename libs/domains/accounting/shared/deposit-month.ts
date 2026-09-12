/**
 * Le mois de remise prévu d'un chèque, dans l'ordre de l'exercice.
 *
 * L'exercice court de septembre à août : c'est dans cet ordre que le trésorier lit le
 * tiroir — ce qui part maintenant, puis ce qui attend. Le mois est stocké en calendaire
 * (1 à 12) pour rester lisible en base ; le rang, lui, replace septembre en tête.
 */

export const SEASON_MONTHS: readonly number[] = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

const LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
};

export function depositMonthLabel(month: number | null | undefined): string {
  return month ? LABELS[month] ?? '' : '';
}

/** Rang du mois dans l'exercice : septembre = 0 … août = 11 ; sans mois = après tous. */
export function depositMonthRank(month: number | null | undefined): number {
  if (!month) return SEASON_MONTHS.length;
  return (month + 3) % 12;
}

/** Choix proposés au formulaire, de septembre à août. */
export const DEPOSIT_MONTH_OPTIONS = SEASON_MONTHS.map((m) => ({ value: m, label: LABELS[m] }));
