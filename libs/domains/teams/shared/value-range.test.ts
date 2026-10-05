import { describe, it, expect } from 'vitest';
import { plageDeValeur, type RangePlayer } from './value-range';
import { CHAMPIONSHIP_RULES } from './championship';
import type { Ranking } from './ranking';

const joueur = (licence: string, gender: 'H' | 'F', ranking: Ranking): RangePlayer => ({
  licence, lastName: licence, firstName: '', gender, category: 'Senior', mutation: 'none',
  singles: ranking, doubles: ranking, mixed: ranking,
  cpphSingles: null, cpphDoubles: null, cpphMixed: null,
  eligibleDisciplines: ['singles', 'doubles', 'mixed']
});

const formatDe = (championship: keyof typeof CHAMPIONSHIP_RULES, division: string) =>
  CHAMPIONSHIP_RULES[championship].divisions.find((d) => d.code === division)!.format;

describe('plageDeValeur — départemental, valeur par ligne', () => {
  const rules = CHAMPIONSHIP_RULES.icd_masculin;
  // 4 SH et 2 DH : six matchs, chaque joueur au plus un simple et un double.
  const format = formatDe('icd_masculin', 'D1');
  // Barème CD91 : D8 = 5, D9 = 4, P10 = 3, P11 = 2, P12 = 1, NC = 0.
  const effectif = [
    joueur('a', 'H', 'D7'), joueur('b', 'H', 'D8'), joueur('c', 'H', 'D9'),
    joueur('d', 'H', 'P10'), joueur('e', 'H', 'P11'), joueur('f', 'H', 'P12')
  ];

  it('borne la valeur entre la compo des plus faibles et celle des plus forts', () => {
    const plage = plageDeValeur(rules, format, effectif)!;
    // Haut : simples 6+5+4+3, doubles (6+5)/2 + (4+3)/2 → (18 + 9) / 6.
    expect(plage.max).toBeCloseTo(27 / 6);
    // Bas : simples 1+2+3+4, doubles (1+2)/2 + (3+4)/2 → (10 + 5) / 6.
    expect(plage.min).toBeCloseTo(15 / 6);
  });

  it("n'aligne pas un joueur sur un tableau où il n'est pas admis", () => {
    const sansDouble = effectif.map((p) =>
      p.licence === 'a' ? { ...p, eligibleDisciplines: ['singles'] as RangePlayer['eligibleDisciplines'] } : p
    );
    // Le D7 ne joue plus en double : il y est remplacé par le P11.
    expect(plageDeValeur(rules, format, sansDouble)!.max).toBeCloseTo((18 + (5 + 4) / 2 + (3 + 2) / 2) / 6);
  });

  it("ne donne aucune plage quand l'effectif ne remplit pas la rencontre", () => {
    // Quatre simples et quatre places de double : trois joueurs à deux matchs n'y suffisent pas.
    expect(plageDeValeur(rules, format, effectif.slice(0, 3))).toBeNull();
  });

  it("n'en donne pas non plus aux vétérans, qui n'ont pas de valeur d'équipe", () => {
    expect(plageDeValeur(CHAMPIONSHIP_RULES.icd_veterans, formatDe('icd_veterans', 'D1'), effectif)).toBeNull();
  });
});

describe('plageDeValeur — régional, trois meilleurs et trois meilleures', () => {
  const rules = CHAMPIONSHIP_RULES.icr_seniors;
  // 2 SH, 2 SD, 1 DH, 1 DD, 2 MX : six places par genre, trois joueurs au moins.
  const format = formatDe('icr_seniors', 'R1');
  // Barème FFBaD : R4 = 30, R5 = 24, R6 = 18, D7 = 12, D8 = 9, D9 = 6.
  const hommes = [joueur('h1', 'H', 'R4'), joueur('h2', 'H', 'R5'), joueur('h3', 'H', 'R6'), joueur('h4', 'H', 'D7'), joueur('h5', 'H', 'D8'), joueur('h6', 'H', 'D9')];
  const femmes = [joueur('f1', 'F', 'R5'), joueur('f2', 'F', 'R6'), joueur('f3', 'F', 'D7'), joueur('f4', 'F', 'D8')];

  it('prend les trois plus forts de chaque genre pour le plafond, les trois plus faibles pour le plancher', () => {
    const plage = plageDeValeur(rules, format, [...hommes, ...femmes])!;
    expect(plage.max).toBeCloseTo((30 + 24 + 18 + 24 + 18 + 12) / 6);
    expect(plage.min).toBeCloseTo((12 + 9 + 6 + 18 + 12 + 9) / 6);
  });
});

describe('plageDeValeur — régional, contrôle exhaustif', () => {
  const rules = CHAMPIONSHIP_RULES.icr_seniors;
  const format = formatDe('icr_seniors', 'R1');
  const RANGS: Ranking[] = ['P10', 'D9', 'D8', 'D7', 'R6', 'R5', 'R4', 'N3'];
  const TABLEAUX = ['singles', 'doubles', 'mixed'] as const;
  // Places d'un genre : 2 simples, 2 places de double, 2 de mixte ; un tableau par joueur.
  const PLACES = [['singles', 2], ['doubles', 2], ['mixed', 2]] as const;

  /** Toutes les feuilles possibles d'un genre : le plus faible et le plus fort trio de tête. */
  function exhaustif(joueurs: RangePlayer[], points: (p: RangePlayer) => number) {
    let min = Infinity;
    let max = -Infinity;
    const matchs = new Map<string, number>();
    const parcourir = (t: number, debut: number, restantes: number, feuille: Set<string>) => {
      if (t === PLACES.length) {
        const top = [...feuille].map((l) => points(joueurs.find((j) => j.licence === l)!)).sort((a, b) => b - a).slice(0, 3);
        const somme = top.reduce((s, n) => s + n, 0);
        min = Math.min(min, somme);
        max = Math.max(max, somme);
        return;
      }
      if (restantes === 0) return parcourir(t + 1, 0, PLACES[t + 1]?.[1] ?? 0, feuille);
      for (let i = debut; i < joueurs.length; i += 1) {
        const j = joueurs[i];
        if (!j.eligibleDisciplines.includes(PLACES[t][0]) || (matchs.get(j.licence) ?? 0) >= 2) continue;
        matchs.set(j.licence, (matchs.get(j.licence) ?? 0) + 1);
        const avant = feuille.has(j.licence);
        feuille.add(j.licence);
        parcourir(t, i + 1, restantes - 1, feuille);
        if (!avant) feuille.delete(j.licence);
        matchs.set(j.licence, matchs.get(j.licence)! - 1);
      }
    };
    parcourir(0, 0, PLACES[0][1], new Set());
    return min === Infinity ? null : { min, max };
  }

  it('trouve le vrai plancher et le vrai plafond sur cent effectifs aux éligibilités disparates', async () => {
    const { bestFfbadPoints } = await import('./team-value');
    let s = 7;
    const hasard = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let essai = 0; essai < 100; essai += 1) {
      const effectif = (genre: 'H' | 'F') =>
        Array.from({ length: 3 + Math.floor(hasard() * 4) }, (_, i) => ({
          ...joueur(`${genre}${essai}-${i}`, genre, RANGS[Math.floor(hasard() * RANGS.length)]),
          eligibleDisciplines: TABLEAUX.filter(() => hasard() > 0.3)
        }));
      const hommes = effectif('H');
      const femmes = effectif('F');
      const h = exhaustif(hommes, bestFfbadPoints);
      const f = exhaustif(femmes, bestFfbadPoints);
      const plage = plageDeValeur(rules, format, [...hommes, ...femmes]);
      if (!h || !f) {
        expect(plage, `essai ${essai}`).toBeNull();
        continue;
      }
      expect(plage!.min, `essai ${essai}`).toBeCloseTo((h.min + f.min) / 6);
      expect(plage!.max, `essai ${essai}`).toBeCloseTo((h.max + f.max) / 6);
    }
  });
});
