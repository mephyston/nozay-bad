import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import CheckDepositManager from './CheckDepositManager.svelte';

describe('CheckDepositManager Component', () => {
  let component: any = null;

  afterEach(() => {
    if (component) {
      unmount(component);
      component = null;
    }
    document.body.innerHTML = '';
  });

  it('renders received checks and past check deposits correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(CheckDepositManager, {
      target,
      props: {
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ],
        checks: [
          {
            id: 1,
            checkDepositId: null,
            seasonId: '25-26',
            number: '1234567',
            amount: 15000, // 150.00 €
            emitter: 'Dupont Marc',
            bank: 'Société Générale',
            memberId: 10,
            transactionId: 100,
            status: 'received',
            photoUrl: null,
            createdAt: '2026-07-13T12:00:00Z',
            memberName: 'Dupont Marc',
            memberLicence: 'LIC-123'
          }
        ],
        checkDeposits: [
          {
            id: 2,
            seasonId: '25-26',
            reference: 'REMISE-OLD-1',
            date: '2026-07-12',
            amount: 30000,
            status: 'deposited',
            bankTransactionId: null,
            createdAt: '2026-07-12T12:00:00Z'
          }
        ],
        members: [
          { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
        ],
        pendingBankTransactions: []
      }
    });

    expect(target.innerHTML).toContain('Chèques reçus');
    expect(target.innerHTML).toContain('1234567');
    expect(target.innerHTML).toContain('Dupont Marc');
    expect(target.innerHTML).toContain('150.00 €');
  });

  it('uses standard UI Checkbox components, has no font-mono usages for check reference/numbers, and has no-print class on Tabs.List', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(CheckDepositManager, {
      target,
      props: {
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ],
        checks: [
          {
            id: 1,
            checkDepositId: null,
            seasonId: '25-26',
            number: '1234567',
            amount: 15000, // 150.00 €
            emitter: 'Dupont Marc',
            bank: 'Société Générale',
            memberId: 10,
            transactionId: 100,
            status: 'received',
            photoUrl: null,
            createdAt: '2026-07-13T12:00:00Z',
            memberName: 'Dupont Marc',
            memberLicence: 'LIC-123'
          }
        ],
        checkDeposits: [
          {
            id: 2,
            seasonId: '25-26',
            reference: 'REMISE-OLD-1',
            date: '2026-07-12',
            amount: 30000,
            status: 'deposited',
            bankTransactionId: null,
            createdAt: '2026-07-12T12:00:00Z'
          }
        ],
        members: [
          { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
        ],
        pendingBankTransactions: []
      }
    });

    // 1. Checkboxes should be the Svelte shared-ui Checkbox components (not raw inputs)
    const inputs = target.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(0);

    const customCheckboxes = target.querySelectorAll('[role="checkbox"]');
    expect(customCheckboxes.length).toBeGreaterThan(0);

    // 2. font-mono should be removed from all numbers, references, and inputs
    const fontMonoElements = target.querySelectorAll('.font-mono');
    expect(fontMonoElements.length).toBe(0);

    // 3. no-print should be on the Tabs.List element
    const noPrintElements = target.querySelectorAll('.no-print');
    expect(noPrintElements.length).toBeGreaterThan(0);
  });
});
