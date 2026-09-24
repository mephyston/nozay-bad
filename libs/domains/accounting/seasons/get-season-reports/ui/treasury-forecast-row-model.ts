import type { Tone } from '@nba/ui';
import { formatAmount } from './report-utils';

/**
 * Projection d'un mois du prévisionnel de trésorerie en rangée de liste.
 *
 * Le tableau compte six colonnes de montants : mois, recettes, dépenses, compte
 * courant, Livret A, total. Sur un téléphone de 390 px il ne tenait pas, et vivait dans
 * un `overflow-x-auto` — or rien ne défile horizontalement dans cette application.
 *
 * La rangée garde ce qu'on vient y chercher : le mois à gauche, le **total** à droite,
 * et sous le mois le mouvement qui l'explique. Le détail par compte reste au tableau,
 * au-dessus de 768 px : les trois séries sont déjà tracées par le graphique qui coiffe
 * le tableau, et un compte pris isolément ne se lit pas sur une ligne de liste.
 */
export type PointDePrevision = {
  month: string;
  label: string;
  realTotal: number | null;
  realCurrent: number | null;
  realSavings: number | null;
  projectedTotal: number | null;
  projectedCurrent: number | null;
  projectedSavings: number | null;
  projectedRecettes: number;
  projectedDepenses: number;
};

export type LigneDePrevision = {
  cle: string;
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
  /** « Réalisé », et seulement là où c'en est un : voir {@link estRealise}. */
  legende?: string;
};

/**
 * Un mois dont le total réel est connu.
 *
 * C'est l'exception dans un prévisionnel — le reste est une estimation — et c'est donc
 * la seule chose que la rangée signale. Le tableau emploie le même mot, « Réalisé », et
 * le tient de cette même fonction : deux vocabulaires pour une même donnée finissent
 * toujours par diverger.
 */
export function estRealise(p: PointDePrevision): boolean {
  return p.realTotal !== null;
}

/** Le total du mois : le réel s'il est connu, la projection sinon, zéro à défaut. */
export function totalDuMois(p: PointDePrevision): number {
  return p.projectedTotal ?? p.realTotal ?? 0;
}

/**
 * Ce qui a bougé dans le mois, recettes puis dépenses.
 *
 * Un mois sans mouvement le dit, plutôt que d'afficher « + · − » : le tableau y met
 * deux tirets, qui à eux seuls ne se lisent pas hors de leurs colonnes.
 */
export function mouvementDuMois(p: PointDePrevision): string {
  const morceaux: string[] = [];
  if (p.projectedRecettes > 0) morceaux.push('+' + formatAmount(p.projectedRecettes));
  if (p.projectedDepenses > 0) morceaux.push('−' + formatAmount(p.projectedDepenses));
  return morceaux.length ? morceaux.join(' · ') : 'aucun mouvement';
}

export function ligneDePrevision(p: PointDePrevision): LigneDePrevision {
  const total = totalDuMois(p);
  return {
    cle: p.month,
    titre: p.label,
    sousTitre: mouvementDuMois(p),
    valeur: formatAmount(total),
    // Un total négatif est un découvert : c'est le seul cas qui demande une couleur.
    ton: total < 0 ? 'destructive' : 'foreground',
    legende: estRealise(p) ? 'réalisé' : undefined
  };
}

export function lignesDePrevision(forecast: PointDePrevision[]): LigneDePrevision[] {
  return forecast.map(ligneDePrevision);
}
