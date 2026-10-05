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

export type Verdict = 'safe' | 'overlap' | 'conflict';

/** Le libellé, la variante de badge et l'explication de chaque verdict ; jamais la couleur seule. */
export const VERDICTS: Record<Verdict, { texte: string; variante: 'success' | 'warning' | 'destructive'; aide: (dessus: string) => string }> = {
  safe: {
    texte: 'Aucun risque',
    variante: 'success',
    aide: (dessus) => `Même sa compo la plus forte reste sous la plus faible de ${dessus}.`
  },
  overlap: {
    texte: 'Selon les compos',
    variante: 'warning',
    aide: (dessus) => `Les deux plages se chevauchent : le dépassement de ${dessus} dépend des compos du jour.`
  },
  conflict: {
    texte: 'Dépassement inévitable',
    variante: 'destructive',
    aide: (dessus) => `Même sa compo la plus faible dépasse la plus forte de ${dessus} : les effectifs sont à revoir.`
  }
};
