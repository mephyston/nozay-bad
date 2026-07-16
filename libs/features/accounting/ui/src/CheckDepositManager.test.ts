import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import CheckDepositManager from './CheckDepositManager.svelte';

describe('CheckDepositManager Component', () => {
  it('renders received checks and past check deposits correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(CheckDepositManager, {
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

    expect(target.innerHTML).toContain('Remise de Chèques');
    expect(target.innerHTML).toContain('1234567');
    expect(target.innerHTML).toContain('Dupont Marc');
    expect(target.innerHTML).toContain('150.00 €');
  });
});
