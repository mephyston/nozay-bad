import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import InitialBalancesConfig from './InitialBalancesConfig.svelte';

describe('InitialBalancesConfig Component', () => {
  it('renders initial balances inputs and selects correct values', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const mockSeasons = [
      {
        id: '25-26',
        name: 'Saison 2025-2026',
        initialCurrentBalance: 100000, // 1000€
        initialSavingsBalance: 200000, // 2000€
        initialCashBalance: 30000,    // 300€
      }
    ];

    mount(InitialBalancesConfig, {
      target,
      props: {
        seasons: mockSeasons,
        seasonId: '25-26'
      }
    });
    flushSync();

    const currentInput = target.querySelector('#current-initial') as HTMLInputElement;
    const savingsInput = target.querySelector('#savings-initial') as HTMLInputElement;
    const cashInput = target.querySelector('#cash-initial') as HTMLInputElement;

    expect(currentInput).not.toBeNull();
    expect(currentInput.value.replace(/\s/g, '').replace(',', '.')).toBe('1000.00');
    expect(savingsInput.value.replace(/\s/g, '').replace(',', '.')).toBe('2000.00');
    expect(cashInput.value.replace(/\s/g, '').replace(',', '.')).toBe('300.00');
  });

  it('disables inputs and displays closed alert when season is closed', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const mockSeasons = [
      {
        id: '25-26',
        name: 'Saison 2025-2026',
        closed: true,
        initialCurrentBalance: 100000,
        initialSavingsBalance: 200000,
        initialCashBalance: 30000,
      }
    ];

    mount(InitialBalancesConfig, {
      target,
      props: {
        seasons: mockSeasons,
        seasonId: '25-26'
      }
    });
    flushSync();

    const currentInput = target.querySelector('#current-initial') as HTMLInputElement;
    const savingsInput = target.querySelector('#savings-initial') as HTMLInputElement;
    const cashInput = target.querySelector('#cash-initial') as HTMLInputElement;

    expect(currentInput).not.toBeNull();
    expect(currentInput.disabled).toBe(true);
    expect(savingsInput.disabled).toBe(true);
    expect(cashInput.disabled).toBe(true);
    expect(target.textContent).toContain('Cette saison est clôturée');
  });
});
