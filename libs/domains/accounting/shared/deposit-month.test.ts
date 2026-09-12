import { describe, it, expect } from 'vitest';
import { SEASON_MONTHS, depositMonthRank, depositMonthLabel, DEPOSIT_MONTH_OPTIONS } from './deposit-month';

describe('deposit-month', () => {
  it("ordonne les mois de septembre à août, l'absence de mois en dernier", () => {
    expect(SEASON_MONTHS.map(depositMonthRank)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(depositMonthRank(null)).toBe(12);
    expect(depositMonthRank(undefined)).toBe(12);
    // Décembre passe avant janvier : l'exercice ne suit pas l'année civile.
    expect(depositMonthRank(12)).toBeLessThan(depositMonthRank(1));
  });

  it('propose les douze mois dans le même ordre, étiquetés en français', () => {
    expect(DEPOSIT_MONTH_OPTIONS.map((o) => o.value)).toEqual(SEASON_MONTHS);
    expect(DEPOSIT_MONTH_OPTIONS[0].label).toBe('Septembre');
    expect(DEPOSIT_MONTH_OPTIONS[11].label).toBe('Août');
    expect(depositMonthLabel(null)).toBe('');
  });
});
