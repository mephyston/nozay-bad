/**
 * Affecter des joueurs aux places d'une rencontre, au mieux ou au pire.
 *
 * Une **place** est un joueur sur une ligne : un simple en compte une, un double ou un
 * mixte deux. Les contraintes sont celles du règlement qui pèsent sur la valeur :
 * - un joueur ne tient qu'une ligne par discipline (pas deux SH, art. 6.2.1) ;
 * - il ne dispute pas plus de `maxMatches` matchs ;
 * - il n'occupe que les disciplines où il est admis (le genre et l'éligibilité sont
 *   déjà résolus par l'appelant, qui ne fournit que les points des places permises).
 *
 * C'est un problème d'affectation, résolu exactement par un flot de coût minimal : les
 * effectifs comptent une douzaine de joueurs, le graphe une trentaine de nœuds, et le
 * calcul tient en une fraction de milliseconde — le plan gratuit n'en accorde que dix
 * par requête, pour six équipes.
 */

export interface SeatGroup {
  /** La discipline de ces places : SH, DH, MX… */
  key: string;
  seats: number;
  /** Poids d'une place dans la valeur : 1 en simple, ½ en double (la paire est moyennée). */
  weight: number;
}

export interface SeatCandidate {
  licence: string;
  /** Les points du joueur sur chaque groupe où il peut jouer ; absent = interdit. */
  points: Record<string, number>;
}

export interface Assignment {
  /** Somme pondérée des points des places occupées. */
  total: number;
  /** Les joueurs alignés, avec le nombre de places tenues. */
  used: Map<string, number>;
}

interface Edge {
  to: number;
  cap: number;
  cost: number;
  rev: number;
}

/** Bonus qui force un joueur à disputer au moins un match, très supérieur à tout total réel. */
const FORCE = 1e6;

/**
 * La meilleure (`max`) ou la plus faible (`min`) affectation qui **remplit toutes les
 * places**, ou `null` si l'effectif n'y suffit pas.
 *
 * `forced` : joueurs qui doivent disputer au moins un match (le régional compte la
 * feuille de match, pas les lignes : on y vérifie qu'une feuille peut les porter).
 */
export function assignSeats(
  candidates: readonly SeatCandidate[],
  groups: readonly SeatGroup[],
  maxMatches: number,
  sense: 'max' | 'min',
  forced: ReadonlySet<string> = new Set()
): Assignment | null {
  const needed = groups.reduce((n, g) => n + g.seats, 0);
  const n = candidates.length;
  // 0 = source, 1..n = joueurs, puis les groupes, puis le puits.
  const sink = n + groups.length + 1;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const addEdge = (from: number, to: number, cap: number, cost: number) => {
    graph[from].push({ to, cap, cost, rev: graph[to].length });
    graph[to].push({ to: from, cap: 0, cost: -cost, rev: graph[from].length - 1 });
  };

  const sign = sense === 'max' ? -1 : 1;
  candidates.forEach((c, i) => {
    const player = i + 1;
    if (forced.has(c.licence)) {
      addEdge(0, player, 1, -FORCE);
      if (maxMatches > 1) addEdge(0, player, maxMatches - 1, 0);
    } else {
      addEdge(0, player, maxMatches, 0);
    }
    groups.forEach((g, j) => {
      const points = c.points[g.key];
      if (points !== undefined) addEdge(player, n + 1 + j, 1, sign * g.weight * points);
    });
  });
  groups.forEach((g, j) => addEdge(n + 1 + j, sink, g.seats, 0));

  let flow = 0;
  while (flow < needed) {
    // Bellman-Ford : les coûts sont négatifs en recherche du maximum.
    const dist = new Array<number>(sink + 1).fill(Infinity);
    const prev: Array<[number, number] | null> = new Array(sink + 1).fill(null);
    dist[0] = 0;
    for (let round = 0; round <= sink; round += 1) {
      let changed = false;
      for (let u = 0; u <= sink; u += 1) {
        if (dist[u] === Infinity) continue;
        graph[u].forEach((e, k) => {
          if (e.cap > 0 && dist[u] + e.cost < dist[e.to] - 1e-9) {
            dist[e.to] = dist[u] + e.cost;
            prev[e.to] = [u, k];
            changed = true;
          }
        });
      }
      if (!changed) break;
    }
    if (dist[sink] === Infinity) return null;
    // Chaque place est une unité de flot : on pousse une unité à la fois.
    for (let v = sink; v !== 0; ) {
      const [u, k] = prev[v]!;
      const e = graph[u][k];
      e.cap -= 1;
      graph[v][e.rev].cap += 1;
      v = u;
    }
    flow += 1;
  }

  let total = 0;
  const used = new Map<string, number>();
  candidates.forEach((c, i) => {
    let places = 0;
    for (const e of graph[i + 1]) {
      // Une arête joueur → groupe saturée = une place tenue. Les arêtes retour vivent
      // dans la liste du groupe, pas dans celle du joueur.
      if (e.to <= n || e.to === sink || e.cap > 0) continue;
      const group = groups[e.to - n - 1];
      places += 1;
      total += group.weight * c.points[group.key];
    }
    if (places > 0) used.set(c.licence, places);
  });

  for (const licence of forced) if (!used.has(licence)) return null;
  return { total, used };
}
