import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import MemberProfile from './MemberProfile.svelte';

describe('MemberProfile Component', () => {
  it('renders profile card containing personal, contact and metadata fields', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(MemberProfile, {
      target,
      props: {
        member: {
          id: 42,
          licence: '1234567',
          lastName: 'Dupont',
          firstName: 'Jean',
          gender: 'M',
          birthDate: '1990-01-01',
          email: 'jean.dupont@example.com',
          phone: '0612345678',
          status: 'valide',
          type: 'Competiteur',
          importedAt: '2026-07-07T12:00:00Z',
          amountDue: 25000,
          amountReceived: 10000,
          amountRemaining: 15000,
          paid: false,
          parent1Name: 'Dupont Marc',
          parent1Email: 'marc@example.com',
          parent1Phone: '0600000004',
          parent2Name: null,
          parent2Email: null,
          parent2Phone: null
        },
        transactions: [
          {
            id: 1,
            type: 'recette',
            amount: 10000,
            date: '2026-07-07',
            description: 'Virement Acompte Jean',
            category: 'adhesions',
            paymentMethod: 'virement'
          }
        ]
      }
    });

    expect(target.innerHTML).toContain('Dupont Jean');
    expect(target.innerHTML).toContain('1234567');
    expect(target.innerHTML).toContain('jean.dupont@example.com');
    expect(target.innerHTML).toContain('0612345678');
    expect(target.innerHTML).toContain('Dupont Marc');
    expect(target.innerHTML).toContain('Virement Acompte Jean');
  });
});
