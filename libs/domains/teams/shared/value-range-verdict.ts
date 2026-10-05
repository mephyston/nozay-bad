import type { ValueRange } from './value-range';

/**
 * Deux plages face à face : celle d'une équipe et celle de l'équipe du dessus.
 *
 * La règle (art. 6.3.2) veut que l'équipe reste inférieure ou égale à celle du dessus.
 * - `safe` : même sa plus forte compo ne dépasse pas la plus faible du dessus.
 * - `conflict` : même sa plus faible dépasse la plus forte du dessus — les effectifs
 *   eux-mêmes sont à revoir.
 * - `overlap` : tout dépend des deux compos du jour.
 */
export function verdictDePlage(
  range: ValueRange | null,
  upper: ValueRange | null
): 'safe' | 'overlap' | 'conflict' | null {
  if (!range || !upper) return null;
  if (range.max <= upper.min) return 'safe';
  if (range.min > upper.max) return 'conflict';
  return 'overlap';
}
