import type { RankedDiscipline } from './ranking';
import type { Repartition } from './roster-balance-score';

/** Ce que la recherche a besoin de savoir d'une équipe et d'un joueur. */
type Equipe = { id: number };
type Joueur = { licence: string; gender: 'H' | 'F' };

export type Quotas = Record<'H' | 'F', { bas: number; haut: number }>;
export type Admis = Map<string, Map<number, RankedDiscipline[]>>;

export function respecte(rep: Repartition, ordre: Equipe[], joueurs: Joueur[], admis: Admis, quotas: Quotas): boolean {
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
export function ameliorer(
  depart: Repartition,
  ordre: Equipe[],
  joueurs: Joueur[],
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
