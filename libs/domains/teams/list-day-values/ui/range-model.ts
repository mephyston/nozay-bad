import { valeurFr } from './day-values-row-model';

/**
 * Le vocabulaire des plages de valeur.
 *
 * Chaque équipe a une barre sur un **axe commun** — c'est le chevauchement de deux
 * barres voisines qui se lit, pas leurs chiffres. La valeur saisie s'y pose en point.
 */

export type Verdict = 'safe' | 'overlap' | 'conflict';

export type EquipeAvecPlage = {
  teamId: number;
  name: string;
  value: number | null;
  upperTeamName: string | null;
  range: { min: number; max: number } | null;
  rangeVerdict: Verdict | null;
};

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

/** Les bornes de l'axe : toutes les plages et valeurs saisies, avec une marge pour les points en bord. */
export function axeDesPlages(equipes: readonly EquipeAvecPlage[]): { min: number; max: number } | null {
  const valeurs = equipes.flatMap((e) => [
    ...(e.range ? [e.range.min, e.range.max] : []),
    ...(e.value !== null ? [e.value] : [])
  ]);
  if (valeurs.length === 0) return null;
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const marge = Math.max((max - min) * 0.05, 0.25);
  return { min: Math.max(0, min - marge), max: max + marge };
}

/** Une valeur en pourcentage de l'axe, pour placer barre et point. */
export const surAxe = (v: number, axe: { min: number; max: number }): number =>
  ((v - axe.min) / (axe.max - axe.min)) * 100;

/** « 3,50 – 5,25 », ou « 4,00 » quand la plage se resserre sur un point. */
export const plageFr = (range: { min: number; max: number }): string =>
  Math.abs(range.max - range.min) < 0.005 ? valeurFr(range.min) : `${valeurFr(range.min)} – ${valeurFr(range.max)}`;
