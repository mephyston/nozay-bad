import { describe, it, expect } from 'vitest';
import { chaineAvecFiltres, effacementTotal, urlDuJournal } from './ledger-filters';

describe('ledger-filters', () => {
  it('pose un critère et ramène toujours à la première page', () => {
    const params = new URLSearchParams(chaineAvecFiltres('?season=26-27&page=4', { month: '09' }));
    expect(params.get('season')).toBe('26-27');
    expect(params.get('month')).toBe('09');
    // Rester page 4 d'une liste qu'on vient de réduire affiche un écran vide sans rien dire.
    expect(params.get('page')).toBe('1');
  });

  it('retire un critère sur une valeur vide ou nulle', () => {
    const params = new URLSearchParams(chaineAvecFiltres('?month=09&search=truc', { month: '', search: null }));
    expect(params.get('month')).toBeNull();
    expect(params.get('search')).toBeNull();
  });

  it('efface tous les critères mais garde le périmètre', () => {
    const depart = '?season=26-27&accountId=cash&month=09&category=7&classCode=6&accrual=charge_a_payer&type=depense&unreconciledCheques=true&search=volants&page=3';
    const params = new URLSearchParams(chaineAvecFiltres(depart, effacementTotal()));

    // La saison et le compte fixent le périmètre : ce ne sont pas des critères de réduction.
    expect(params.get('season')).toBe('26-27');
    expect(params.get('accountId')).toBe('cash');

    for (const cle of ['month', 'category', 'classCode', 'accrual', 'type', 'unreconciledCheques', 'search']) {
      expect(params.get(cle), `« ${cle} » aurait dû être effacé`).toBeNull();
    }
    expect(params.get('page')).toBe('1');
  });

  it('rend une adresse complète du journal', () => {
    expect(urlDuJournal('?season=26-27', { search: 'volants' })).toMatch(
      /^\/admin\/accounting\?.*search=volants/
    );
  });
});
