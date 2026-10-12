import { describe, it, expect } from 'vitest';
import { saisonDeSaisie, saisonsDeSaisie } from './entry-season';

const SAISONS = [
  { id: '1', name: '2024-2025', startDate: '2024-09-01', endDate: '2025-08-31', closed: true, active: false },
  { id: '2', name: '2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', closed: false, active: false },
  { id: '3', name: '2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', closed: false, active: true }
];

describe('entry-season', () => {
  it("propose l'exercice en cours, même quand le grand livre en affiche un autre", () => {
    expect(saisonDeSaisie(SAISONS, '2', '2026-10-12')).toBe('3');
    expect(saisonDeSaisie(SAISONS, '1', '2026-10-12')).toBe('3');
  });

  it("retombe sur l'exercice actif quand les bornes manquent", () => {
    const sansBornes = SAISONS.map(({ startDate, endDate, ...s }) => s);
    expect(saisonDeSaisie(sansBornes, '2', '2026-10-12')).toBe('3');
  });

  it("ne propose jamais un exercice clôturé", () => {
    // L'exercice de la date est clôturé et aucun n'est actif : le dernier ouvert.
    const saisons = SAISONS.map((s) => ({ ...s, active: false, closed: s.id !== '2' }));
    expect(saisonDeSaisie(saisons, '1', '2026-10-12')).toBe('2');
  });

  it("retire les exercices clôturés de la liste, sauf celui de l'écriture modifiée", () => {
    expect(saisonsDeSaisie(SAISONS, '3').map((s) => s.id)).toEqual(['2', '3']);
    expect(saisonsDeSaisie(SAISONS, '1').map((s) => s.id)).toEqual(['1', '2', '3']);
  });
});
