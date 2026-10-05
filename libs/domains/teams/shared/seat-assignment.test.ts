import { describe, it, expect } from 'vitest';
import { assignSeats, type SeatCandidate, type SeatGroup } from './seat-assignment';

/** Le contrôle exhaustif : toutes les façons de remplir les places, pour de petits effectifs. */
function exhaustif(candidats: SeatCandidate[], groupes: SeatGroup[], maxMatches: number) {
  let min = Infinity;
  let max = -Infinity;
  const usage = new Map<string, number>();
  const parcourir = (g: number, debut: number, restantes: number, total: number) => {
    if (g === groupes.length) {
      min = Math.min(min, total);
      max = Math.max(max, total);
      return;
    }
    const groupe = groupes[g];
    if (restantes === 0) return parcourir(g + 1, 0, groupes[g + 1]?.seats ?? 0, total);
    for (let i = debut; i < candidats.length; i += 1) {
      const c = candidats[i];
      const points = c.points[groupe.key];
      if (points === undefined || (usage.get(c.licence) ?? 0) >= maxMatches) continue;
      usage.set(c.licence, (usage.get(c.licence) ?? 0) + 1);
      parcourir(g, i + 1, restantes - 1, total + groupe.weight * points);
      usage.set(c.licence, usage.get(c.licence)! - 1);
    }
  };
  parcourir(0, 0, groupes[0].seats, 0);
  return min === Infinity ? null : { min, max };
}

/** Générateur pseudo-aléatoire déterministe : un test qui échoue doit se rejouer à l'identique. */
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

describe('assignSeats', () => {
  const groupes: SeatGroup[] = [
    { key: 'SH', seats: 2, weight: 1 },
    { key: 'DH', seats: 2, weight: 0.5 },
    { key: 'MX', seats: 2, weight: 0.5 }
  ];

  it("ne fait pas jouer un joueur plus de deux matchs, ni deux fois la même discipline", () => {
    const fort: SeatCandidate = { licence: 'fort', points: { SH: 12, DH: 12, MX: 12 } };
    const autres = ['a', 'b', 'c'].map((licence) => ({ licence, points: { SH: 1, DH: 1, MX: 1 } }));
    const haut = assignSeats([fort, ...autres], groupes, 2, 'max')!;
    expect(haut.used.get('fort')).toBe(2);
    // Le fort prend le simple (poids 1) et un double ou un mixte (poids ½).
    expect(haut.total).toBe(12 + 1 + 6 + 0.5 + 0.5 + 0.5);
  });

  it("répond null quand l'effectif ne remplit pas toutes les places", () => {
    const deux = ['a', 'b'].map((licence) => ({ licence, points: { SH: 1, DH: 1, MX: 1 } }));
    // Six places, deux joueurs à deux matchs : quatre au plus.
    expect(assignSeats(deux, groupes, 2, 'max')).toBeNull();
  });

  it('impose un joueur forcé, ou renonce si la feuille ne peut pas le porter', () => {
    const joueurs = [
      { licence: 'simple', points: { SH: 3 } },
      ...['a', 'b', 'c'].map((licence) => ({ licence, points: { SH: 5, DH: 5, MX: 5 } }))
    ];
    expect(assignSeats(joueurs, groupes, 2, 'max', new Set(['simple']))!.used.has('simple')).toBe(true);
    const horsJeu = [{ licence: 'personne', points: {} }, ...joueurs.slice(1)];
    expect(assignSeats(horsJeu, groupes, 2, 'max', new Set(['personne']))).toBeNull();
  });

  it("trouve exactement le minimum et le maximum sur cent effectifs tirés au hasard", () => {
    const hasard = lcg(42);
    for (let essai = 0; essai < 100; essai += 1) {
      const effectif = Array.from({ length: 3 + Math.floor(hasard() * 4) }, (_, i) => ({
        licence: `j${i}`,
        points: Object.fromEntries(
          groupes.filter(() => hasard() > 0.2).map((g) => [g.key, Math.floor(hasard() * 13)])
        )
      }));
      const attendu = exhaustif(effectif, groupes, 2);
      const bas = assignSeats(effectif, groupes, 2, 'min');
      const haut = assignSeats(effectif, groupes, 2, 'max');
      if (attendu === null) {
        expect(bas, `essai ${essai}`).toBeNull();
        continue;
      }
      expect(bas!.total, `essai ${essai}`).toBeCloseTo(attendu.min);
      expect(haut!.total, `essai ${essai}`).toBeCloseTo(attendu.max);
    }
  });
});
