import { describe, it, expect } from 'vitest';
import { checkLineup, type LineupContext } from './lineup-rules';
import { CHAMPIONSHIP_RULES, getDivision } from './championship';
import type { PlayerRanking } from './player';
import type { LineupEntry } from './team-value';
import type { Ranking, Mutation } from './ranking';

function p(
  licence: string,
  gender: 'H' | 'F',
  r: { s?: Ranking | null; d?: Ranking | null; m?: Ranking | null },
  over: { category?: string; mutation?: Mutation } = {}
): PlayerRanking {
  return {
    licence,
    lastName: `N${licence}`,
    firstName: 'Test',
    gender,
    category: over.category ?? 'Senior',
    mutation: over.mutation ?? 'none',
    singles: r.s ?? null,
    doubles: r.d ?? null,
    mixed: r.m ?? null,
    cpphSingles: null,
    cpphDoubles: null,
    cpphMixed: null
  };
}

const mixte = CHAMPIONSHIP_RULES.icd_mixte;
const mixteD2 = getDivision('icd_mixte', 'D2')!;

/** Une composition complète et régulière de mixte D2 (7 matchs). */
function validEntries(): LineupEntry[] {
  return [
    { discipline: 'SH', position: 1, players: [p('h1', 'H', { s: 'D7' })] },
    { discipline: 'SH', position: 2, players: [p('h2', 'H', { s: 'D8' })] },
    { discipline: 'SH', position: 3, players: [p('h3', 'H', { s: 'D9' })] },
    { discipline: 'SD', position: 1, players: [p('f1', 'F', { s: 'D8' })] },
    { discipline: 'DH', position: 1, players: [p('h4', 'H', { d: 'D8' }), p('h5', 'H', { d: 'D9' })] },
    { discipline: 'DD', position: 1, players: [p('f2', 'F', { d: 'D8' }), p('f3', 'F', { d: 'D9' })] },
    { discipline: 'MX', position: 1, players: [p('h6', 'H', { m: 'D8' }), p('f4', 'F', { m: 'D9' })] }
  ];
}

function check(over: Partial<LineupContext> = {}) {
  return checkLineup({ rules: mixte, division: mixteD2, entries: validEntries(), ...over });
}

describe('composition régulière', () => {
  it('ne produit ni erreur ni avertissement', () => {
    const verdict = check();

    expect(verdict.errors).toEqual([]);
    expect(verdict.warnings).toEqual([]);
    expect(verdict.valid).toBe(true);
  });
});

describe('règles bloquantes', () => {
  it('E2 — refuse un joueur aligné plus de deux fois', () => {
    const entries = validEntries();
    const star = p('h1', 'H', { s: 'D7', d: 'D7', m: 'D7' });
    entries[0].players = [star];
    entries[4].players = [star, p('h5', 'H', { d: 'D9' })];
    entries[6].players = [star, p('f4', 'F', { m: 'D9' })];

    const verdict = check({ entries });

    expect(verdict.valid).toBe(false);
    expect(verdict.errors.map((e) => e.code)).toContain('E2');
  });

  it('E3 — refuse deux matchs dans la même discipline', () => {
    const entries = validEntries();
    const same = p('h1', 'H', { s: 'D7' });
    entries[0].players = [same];
    entries[1].players = [same];

    expect(check({ entries }).errors.map((e) => e.code)).toContain('E3');
  });

  it('E5 — refuse un homme en simple dame', () => {
    const entries = validEntries();
    entries[3].players = [p('h9', 'H', { s: 'D8' })];

    expect(check({ entries }).errors.map((e) => e.code)).toContain('E5');
  });

  it('E1 — refuse un classement hors division', () => {
    const masculin = CHAMPIONSHIP_RULES.icd_masculin;
    const d2 = getDivision('icd_masculin', 'D2')!; // D7 maximum
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [p('h1', 'H', { s: 'R6' })] }
    ];

    const verdict = checkLineup({ rules: masculin, division: d2, entries });

    expect(verdict.errors.map((e) => e.code)).toContain('E1');
  });

  it('E6 — refuse une catégorie non admise', () => {
    const veterans = CHAMPIONSHIP_RULES.icd_veterans;
    const d2 = getDivision('icd_veterans', 'D2')!;
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [p('h1', 'H', { s: 'D9' }, { category: 'Senior' })] }
    ];

    expect(checkLineup({ rules: veterans, division: d2, entries }).errors.map((e) => e.code)).toContain('E6');
  });

  it('E4 — refuse un joueur déjà aligné ailleurs dans le club cette semaine', () => {
    const verdict = check({ busyThisWeek: new Map([['h1', 'NBA91-1']]) });

    const issue = verdict.errors.find((e) => e.code === 'E4');
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('NBA91-1');
    expect(issue!.message).toContain('semaine');
  });

  it('E7 — refuse plus de deux mutés', () => {
    const entries = validEntries();
    entries[0].players = [p('h1', 'H', { s: 'D7' }, { mutation: 'normal' })];
    entries[1].players = [p('h2', 'H', { s: 'D8' }, { mutation: 'normal' })];
    entries[2].players = [p('h3', 'H', { s: 'D9' }, { mutation: 'dossier' })];

    expect(check({ entries }).errors.map((e) => e.code)).toContain('E7');
  });

  it("n'applique pas la limite de mutés aux vétérans, qui n'en ont pas", () => {
    const veterans = CHAMPIONSHIP_RULES.icd_veterans;
    const d2 = getDivision('icd_veterans', 'D2')!;
    const muted = (l: string) =>
      p(l, 'H', { s: 'D9' }, { category: 'Veteran 2', mutation: 'normal' });
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [muted('a')] },
      { discipline: 'SH', position: 2, players: [muted('b')] }
    ];

    expect(checkLineup({ rules: veterans, division: d2, entries }).errors.map((e) => e.code)).not.toContain('E7');
  });
});

describe('avertissements', () => {
  it('W1 — signale une valeur supérieure à celle de l’équipe du dessus', () => {
    const verdict = check({ upperTeamValue: 3, upperTeamName: 'NBA91-2' });

    const issue = verdict.warnings.find((w) => w.code === 'W1');
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('NBA91-2');
    // Avertissement, jamais blocage : l'équipe du dessus peut encore changer.
    expect(verdict.valid).toBe(true);
  });

  it('W1 — se tait quand la valeur reste sous celle de l’équipe du dessus', () => {
    expect(check({ upperTeamValue: 12, upperTeamName: 'NBA91-2' }).warnings.map((w) => w.code)).not.toContain('W1');
  });

  it('W2 — signale un ordre de classement inversé', () => {
    const entries = validEntries();
    entries[0].players = [p('h1', 'H', { s: 'D9' })]; // SH1 plus faible
    entries[1].players = [p('h2', 'H', { s: 'D7' })]; // que SH2

    const issue = check({ entries }).warnings.find((w) => w.code === 'W2');
    expect(issue).toBeDefined();
    expect(issue!.slot).toBe('SH2');
  });

  it('W2 — accepte un classement égal, où l’ordre est libre', () => {
    const entries = validEntries();
    entries[0].players = [p('h1', 'H', { s: 'D8' })];
    entries[1].players = [p('h2', 'H', { s: 'D8' })];

    expect(check({ entries }).warnings.map((w) => w.code)).not.toContain('W2');
  });

  it('W3 — signale une équipe incomplète sans la refuser', () => {
    const verdict = check({ entries: validEntries().slice(0, 5) });

    expect(verdict.warnings.map((w) => w.code)).toContain('W3');
    expect(verdict.valid).toBe(true);
  });

  it('W4 — signale un classement manquant plutôt que de le deviner', () => {
    const entries = validEntries();
    entries[0].players = [p('h1', 'H', { s: null })];

    const verdict = check({ entries });

    expect(verdict.warnings.map((w) => w.code)).toContain('W4');
    expect(verdict.value.value).toBeNull();
  });
});

describe('règles d’historique', () => {
  const licence = 'h1';

  /** Une composition minimale, pour isoler la règle testée. */
  function withHistory(
    past: Array<{ championship: string; teamId: number; teamNumber: number; weekStart: string }>,
    over: Partial<Parameters<typeof checkLineup>[0]> = {}
  ) {
    return checkLineup({
      rules: mixte,
      division: mixteD2,
      entries: [{ discipline: 'SH', position: 1, players: [p(licence, 'H', { s: 'D8' })] }],
      teamNumber: 3,
      history: new Map([[licence, past]]),
      ...over
    });
  }

  describe('W5 — titularisation', () => {
    it('signale un joueur titulaire d’une équipe supérieure', () => {
      const past = [1, 2, 3].map((i) => ({
        championship: 'icd_mixte', teamId: 10, teamNumber: 1, weekStart: `2026-11-0${i}`
      }));

      const issue = withHistory(past).warnings.find((w) => w.code === 'W5');
      expect(issue).toBeDefined();
      expect(issue!.message).toContain('NBA91-1');
    });

    it('se tait sous trois rencontres', () => {
      const past = [1, 2].map((i) => ({
        championship: 'icd_mixte', teamId: 10, teamNumber: 1, weekStart: `2026-11-0${i}`
      }));

      expect(withHistory(past).warnings.map((w) => w.code)).not.toContain('W5');
    });

    it('se tait quand le joueur est titulaire d’une équipe INFÉRIEURE : monter est libre', () => {
      const past = [1, 2, 3].map((i) => ({
        championship: 'icd_mixte', teamId: 10, teamNumber: 5, weekStart: `2026-11-0${i}`
      }));

      expect(withHistory(past).warnings.map((w) => w.code)).not.toContain('W5');
    });

    it('ne compte que le même championnat', () => {
      const past = [1, 2, 3].map((i) => ({
        championship: 'icd_masculin', teamId: 10, teamNumber: 1, weekStart: `2026-11-0${i}`
      }));

      expect(withHistory(past).warnings.map((w) => w.code)).not.toContain('W5');
    });
  });

  describe('W6 — renforts venus du championnat voisin', () => {
    /** Trois joueurs dont la dernière rencontre était en masculin. */
    function crossReinforced(count: number) {
      const licences = ['a', 'b', 'c', 'd'].slice(0, count);
      const entries = licences.map((l, i) => ({
        discipline: 'SH' as const,
        position: i + 1,
        players: [p(l, 'H', { s: 'D8' })]
      }));
      const history = new Map(
        licences.map((l) => [
          l,
          [{ championship: 'icd_masculin', teamId: 20, teamNumber: 1, weekStart: '2026-11-02' }]
        ])
      );
      return checkLineup({ rules: mixte, division: mixteD2, entries, teamNumber: 3, history });
    }

    it('signale au-delà de deux', () => {
      expect(crossReinforced(3).warnings.map((w) => w.code)).toContain('W6');
    });

    it('se tait à deux', () => {
      expect(crossReinforced(2).warnings.map((w) => w.code)).not.toContain('W6');
    });

    it('ne retient que la DERNIÈRE rencontre du joueur', () => {
      // Passé en masculin, mais revenu en mixte depuis : ce n'est plus un renfort.
      const past = [
        { championship: 'icd_masculin', teamId: 20, teamNumber: 1, weekStart: '2026-11-02' },
        { championship: 'icd_mixte', teamId: 10, teamNumber: 3, weekStart: '2026-11-09' }
      ];

      expect(withHistory(past).warnings.map((w) => w.code)).not.toContain('W6');
    });
  });

  describe('W7 — joueurs venus du régional', () => {
    function fromRegional(count: number) {
      const licences = ['a', 'b', 'c'].slice(0, count);
      const entries = licences.map((l, i) => ({
        discipline: 'SH' as const,
        position: i + 1,
        players: [p(l, 'H', { s: 'D8' })]
      }));
      const history = new Map(
        licences.map((l) => [
          l,
          [{ championship: 'icr_seniors', teamId: 30, teamNumber: 1, weekStart: '2026-11-02' }]
        ])
      );
      return checkLineup({ rules: mixte, division: mixteD2, entries, teamNumber: 3, history });
    }

    it('signale au-delà d’un seul', () => {
      expect(fromRegional(2).warnings.map((w) => w.code)).toContain('W7');
    });

    it('se tait à un', () => {
      expect(fromRegional(1).warnings.map((w) => w.code)).not.toContain('W7');
    });

    it('ne s’applique pas au régional lui-même', () => {
      const icr = CHAMPIONSHIP_RULES.icr_seniors;
      const pn = getDivision('icr_seniors', 'PN')!;
      const entries = ['a', 'b'].map((l, i) => ({
        discipline: 'SH' as const, position: i + 1, players: [p(l, 'H', { s: 'R6' })]
      }));
      const history = new Map(
        ['a', 'b'].map((l) => [
          l,
          [{ championship: 'icr_seniors', teamId: 30, teamNumber: 1, weekStart: '2026-11-02' }]
        ])
      );

      expect(
        checkLineup({ rules: icr, division: pn, entries, teamNumber: 1, history }).warnings.map((w) => w.code)
      ).not.toContain('W7');
    });
  });

  it('reste silencieux sans historique : rien ne se déduit d’une absence de données', () => {
    const verdict = checkLineup({
      rules: mixte,
      division: mixteD2,
      entries: [{ discipline: 'SH', position: 1, players: [p('h1', 'H', { s: 'D8' })] }],
      teamNumber: 3
    });

    expect(verdict.warnings.map((w) => w.code)).not.toContain('W5');
    expect(verdict.warnings.map((w) => w.code)).not.toContain('W6');
    expect(verdict.warnings.map((w) => w.code)).not.toContain('W7');
  });
});
