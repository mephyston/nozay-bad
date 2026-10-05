import { formatValue } from '../../shared/team-value';
import { verdictDePlage, type Verdict } from '../../shared/value-range-verdict';
import type { BalanceResult } from '../../shared/roster-balance';
import type { ValueRange } from '../../shared/value-range';
import type { GetRosterBalanceOutput, RosterBalancePlayer } from '../dto';

/**
 * Ce que la feuille d'équilibrage montre, équipe par équipe : la plage avant et après,
 * le verdict face à l'équipe du dessus, et qui arrive ou part.
 */
export interface EquipeEquilibree {
  id: number;
  name: string;
  divisionLabel: string;
  hommes: number;
  femmes: number;
  avant: string;
  apres: string;
  verdictAvant: Verdict | null;
  verdictApres: Verdict | null;
  restent: RosterBalancePlayer[];
  arrivent: Array<{ joueur: RosterBalancePlayer; depuis: string | null }>;
  partent: Array<{ joueur: RosterBalancePlayer; vers: string }>;
}

export const plageTexte = (r: ValueRange | null | undefined): string =>
  !r ? 'effectif insuffisant' : Math.abs(r.max - r.min) < 0.005 ? formatValue(r.min) : `${formatValue(r.min)} – ${formatValue(r.max)}`;

export const nomJoueur = (p: RosterBalancePlayer): string => `${p.lastName} ${p.firstName}`.trim();

/** Les classements simple / double / mixte d'un joueur, « D7/D8/R6 ». */
export const classementsTexte = (p: RosterBalancePlayer): string =>
  [p.singles, p.doubles, p.mixed].map((r) => r ?? '—').join('/');

export function vueEquilibrage(pool: GetRosterBalanceOutput, result: BalanceResult): EquipeEquilibree[] {
  const nom = new Map(pool.teams.map((t) => [t.id, t.name]));
  const ordre = [...pool.teams].sort((a, b) => a.number - b.number);
  const parNom = (a: RosterBalancePlayer, b: RosterBalancePlayer) => nomJoueur(a).localeCompare(nomJoueur(b), 'fr');
  return ordre.map((t, i) => {
    const dessus = i > 0 ? ordre[i - 1].id : null;
    const membres = pool.players.filter((p) => result.assignment.get(p.licence) === t.id).sort(parNom);
    return {
      id: t.id,
      name: t.name,
      divisionLabel: t.divisionLabel,
      hommes: membres.filter((p) => p.gender === 'H').length,
      femmes: membres.filter((p) => p.gender === 'F').length,
      avant: plageTexte(result.currentRanges.get(t.id)),
      apres: plageTexte(result.ranges.get(t.id)),
      verdictAvant: dessus === null ? null : verdictDePlage(result.currentRanges.get(t.id) ?? null, result.currentRanges.get(dessus) ?? null),
      verdictApres: dessus === null ? null : verdictDePlage(result.ranges.get(t.id) ?? null, result.ranges.get(dessus) ?? null),
      restent: membres.filter((p) => p.teamId === t.id),
      arrivent: membres.filter((p) => p.teamId !== t.id).map((joueur) => ({ joueur, depuis: joueur.teamId ? (nom.get(joueur.teamId) ?? null) : null })),
      partent: pool.players
        .filter((p) => p.teamId === t.id && result.assignment.has(p.licence) && result.assignment.get(p.licence) !== t.id)
        .sort(parNom)
        .map((joueur) => ({ joueur, vers: nom.get(result.assignment.get(joueur.licence)!) ?? '' }))
    };
  });
}

/** La répartition à écrire : chaque équipe et ses licences, joueurs non placés laissés où ils sont. */
export function repartitionAEcrire(pool: GetRosterBalanceOutput, result: BalanceResult) {
  return pool.teams.map((t) => ({
    teamId: t.id,
    licences: pool.players
      .filter((p) => (result.assignment.get(p.licence) ?? p.teamId) === t.id)
      .map((p) => p.licence)
  }));
}
