import { CHAMPIONSHIP_RULES, getDivision, type Championship } from './championship';
import { checkEligibility } from './eligibility';
import { cd91Points } from './scales';
import { RANKED_DISCIPLINES, type RankedDiscipline } from './ranking';
import { rankingOf, type PlayerRanking } from './player';
import { plageDeValeur, type ValueRange } from './value-range';
import { scoreDeRepartition, type Repartition } from './roster-balance-score';

/**
 * Équilibrer les effectifs d'un championnat, une fois, en début de saison.
 *
 * Les joueurs déjà répartis entre les équipes du championnat forment le vivier. On
 * cherche une répartition qui :
 * - respecte l'éligibilité de chaque division (plafonds, planchers, catégorie) ;
 * - garde dans chaque équipe autant de garçons, et autant de filles, à un près ;
 * - ordonne les équipes de la plus forte à la plus faible avec le moins de
 *   chevauchement possible entre plages de valeur voisines (RF-TEA-009).
 *
 * Le calcul tourne dans le navigateur : il évalue des milliers de répartitions, bien
 * au-delà des 10 ms de CPU qu'un Worker du plan gratuit accorde à une requête.
 */

export interface BalanceTeam {
  id: number;
  number: number;
  division: string;
}

export type BalancePlayer = PlayerRanking & { teamId: number | null };

export interface BalanceResult {
  /** Licence → équipe proposée. */
  assignment: Map<string, number>;
  ranges: Map<number, ValueRange | null>;
  score: number;
  /** Les plages et le score des effectifs actuels, pour comparer. */
  currentRanges: Map<number, ValueRange | null>;
  currentScore: number;
  /** Les joueurs qui changent d'équipe par rapport aux effectifs actuels. */
  moves: Array<{ licence: string; from: number | null; to: number }>;
  /** Admis dans aucune équipe du championnat : à traiter à la main. */
  unplaced: string[];
  /**
   * `false` quand l'éligibilité rend impossible l'équilibre garçons/filles à un près :
   * la répartition proposée est la meilleure trouvée, mais l'écran doit le dire.
   */
  quotasRespected: boolean;
}

/** Force d'un joueur pour l'ordre de départ : ses points CD91, toutes disciplines. */
const force = (p: PlayerRanking): number =>
  RANKED_DISCIPLINES.reduce((s, d) => {
    const r = rankingOf(p, d);
    return s + (r === null ? -1 : cd91Points(r));
  }, 0);

export function equilibrer(championship: Championship, teams: BalanceTeam[], players: BalancePlayer[]): BalanceResult {
  const rules = CHAMPIONSHIP_RULES[championship];
  const ordre = [...teams].sort((a, b) => a.number - b.number);
  const division = new Map(ordre.map((t) => [t.id, getDivision(championship, t.division)!]));

  // Qui peut jouer où, et sur quels tableaux.
  const admis = new Map<string, Map<number, RankedDiscipline[]>>();
  for (const p of players) {
    const parEquipe = new Map<number, RankedDiscipline[]>();
    for (const t of ordre) {
      const verdict = checkEligibility(division.get(t.id)!, rules.categories, p);
      if (verdict.eligible) parEquipe.set(t.id, verdict.disciplines);
    }
    admis.set(p.licence, parEquipe);
  }
  const placables = players.filter((p) => admis.get(p.licence)!.size > 0);
  const unplaced = players.filter((p) => admis.get(p.licence)!.size === 0).map((p) => p.licence);

  // Quotas par genre : autant dans chaque équipe, à un près.
  const quota = (genre: 'H' | 'F') => {
    const n = placables.filter((p) => p.gender === genre).length;
    return { bas: Math.floor(n / ordre.length), haut: Math.ceil(n / ordre.length) };
  };
  const quotas = { H: quota('H'), F: quota('F') };

  const cache = new Map<string, ValueRange | null>();
  const plage = (teamId: number, membres: BalancePlayer[]): ValueRange | null => {
    const cle = `${teamId}:${membres.map((m) => m.licence).sort().join(',')}`;
    if (!cache.has(cle)) {
      const joueurs = membres.map((m) => ({ ...m, eligibleDisciplines: admis.get(m.licence)!.get(teamId) ?? [] }));
      cache.set(cle, plageDeValeur(rules, division.get(teamId)!.format, joueurs));
    }
    return cache.get(cle)!;
  };

  const actuel = new Map(players.map((p) => [p.licence, p.teamId]));
  const evaluer = (rep: Repartition) =>
    scoreDeRepartition(rep, ordre, placables, plage, actuel, rules.hierarchy !== 'none');

  // Départ : du plus fort au plus faible, chacun dans la première équipe qui l'admet
  // et dont le quota n'est pas atteint. Les premières équipes prennent le surplus.
  const depart: Repartition = new Map();
  for (const genre of ['H', 'F'] as const) {
    const q = quotas[genre];
    const reste = placables.filter((p) => p.gender === genre).length - q.bas * ordre.length;
    const cible = new Map(ordre.map((t, i) => [t.id, q.bas + (i < reste ? 1 : 0)]));
    const compte = new Map(ordre.map((t) => [t.id, 0]));
    for (const p of [...placables].filter((x) => x.gender === genre).sort((a, b) => force(b) - force(a))) {
      const t =
        ordre.find((e) => admis.get(p.licence)!.has(e.id) && compte.get(e.id)! < cible.get(e.id)!) ??
        ordre.find((e) => admis.get(p.licence)!.has(e.id))!;
      depart.set(p.licence, t.id);
      compte.set(t.id, compte.get(t.id)! + 1);
    }
  }

  // Le départ « actuel » n'est retenu que s'il respecte déjà éligibilité et quotas.
  const departs = [depart];
  const courant: Repartition = new Map(placables.map((p) => [p.licence, p.teamId ?? -1]));
  if (respecte(courant, ordre, placables, admis, quotas)) departs.push(courant);

  let meilleur = { rep: depart, score: evaluer(depart).score };
  for (const d of departs) {
    const r = ameliorer(d, ordre, placables, admis, quotas, evaluer);
    if (r.score < meilleur.score) meilleur = r;
  }

  const final = evaluer(meilleur.rep);
  // Les effectifs actuels, tels qu'ils sont : un joueur inscrit là où il n'est pas
  // admis y compte pour rien, comme il compterait le jour de la rencontre.
  const avant = scoreDeRepartition(new Map(players.map((p) => [p.licence, p.teamId ?? -1])), ordre, players, plage, actuel, rules.hierarchy !== 'none');
  return {
    quotasRespected: respecte(meilleur.rep, ordre, placables, admis, quotas),
    currentRanges: avant.ranges,
    currentScore: avant.score,
    assignment: meilleur.rep,
    ranges: final.ranges,
    score: final.score,
    moves: placables
      .filter((p) => p.teamId !== meilleur.rep.get(p.licence))
      .map((p) => ({ licence: p.licence, from: p.teamId, to: meilleur.rep.get(p.licence)! })),
    unplaced
  };
}

type Quotas = Record<'H' | 'F', { bas: number; haut: number }>;
type Admis = Map<string, Map<number, RankedDiscipline[]>>;

function respecte(rep: Repartition, ordre: BalanceTeam[], joueurs: BalancePlayer[], admis: Admis, quotas: Quotas): boolean {
  if (joueurs.some((p) => !admis.get(p.licence)!.has(rep.get(p.licence)!))) return false;
  return ordre.every((t) =>
    (['H', 'F'] as const).every((g) => {
      const n = joueurs.filter((p) => p.gender === g && rep.get(p.licence) === t.id).length;
      return n >= quotas[g].bas && n <= quotas[g].haut;
    })
  );
}

/**
 * Descente : à chaque tour, le meilleur échange de deux joueurs de même genre ou le
 * meilleur déplacement qui garde les quotas, tant qu'il fait baisser le score.
 */
function ameliorer(
  depart: Repartition,
  ordre: BalanceTeam[],
  joueurs: BalancePlayer[],
  admis: Admis,
  quotas: Quotas,
  evaluer: (rep: Repartition) => { score: number }
): { rep: Repartition; score: number } {
  let rep = new Map(depart);
  let score = evaluer(rep).score;
  for (let tour = 0; tour < 100; tour += 1) {
    let mieux: { rep: Repartition; score: number } | null = null;
    const essayer = (candidat: Repartition) => {
      const s = evaluer(candidat).score;
      if (s < (mieux?.score ?? score) - 1e-9) mieux = { rep: candidat, score: s };
    };
    for (const [i, p] of joueurs.entries()) {
      const tp = rep.get(p.licence)!;
      for (const q of joueurs.slice(i + 1)) {
        const tq = rep.get(q.licence)!;
        if (tp === tq || p.gender !== q.gender) continue;
        if (!admis.get(p.licence)!.has(tq) || !admis.get(q.licence)!.has(tp)) continue;
        essayer(new Map(rep).set(p.licence, tq).set(q.licence, tp));
      }
      for (const t of ordre) {
        if (t.id === tp || !admis.get(p.licence)!.has(t.id)) continue;
        const candidat = new Map(rep).set(p.licence, t.id);
        if (respecte(candidat, ordre, joueurs, admis, quotas)) essayer(candidat);
      }
    }
    if (!mieux) break;
    ({ rep, score } = mieux as { rep: Repartition; score: number });
  }
  return { rep, score };
}
