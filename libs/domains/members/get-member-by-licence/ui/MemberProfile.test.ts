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
          },
          {
            id: 2,
            type: 'depense',
            amount: 4200,
            date: '2026-07-20',
            description: 'Remboursement frais de déplacement',
            category: 'championnats',
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
    // L'onglet "Historique Financier" affiche les écritures sous forme compacte
    // (Date / Type / Catégorie / Montant) — on vérifie que la transaction est rendue
    // via son montant (100,00 €) plutôt que sa description, qui n'est plus affichée.
    expect(target.innerHTML).toContain('100,00');
    // Le sens de l'écriture est explicite : achat de l'adhérent vs remboursement.
    expect(target.innerHTML).toContain('Achat');
    expect(target.innerHTML).toContain('Remboursement');
    // Les coordonnées de l'adhérent et celles du représentant sont attribuées.
    expect(target.innerHTML).toContain('Adhérent');
    expect(target.innerHTML).toContain('Représentant légal');
  });

  it("n'attribue pas à l'adhérent les coordonnées de son représentant", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(MemberProfile, {
      target,
      props: {
        // Cas d'un mineur : aucune coordonnée propre, seul le parent est joignable.
        member: {
          id: 43,
          licence: '7654321',
          lastName: 'Petit',
          firstName: 'Lou',
          gender: 'F',
          birthDate: '2014-05-02',
          email: null,
          phone: null,
          status: 'valide',
          type: 'Jeune',
          importedAt: '2026-07-07T12:00:00Z',
          amountDue: 15000,
          amountReceived: 15000,
          amountRemaining: 0,
          paid: true,
          parent1Name: 'Petit Sophie',
          parent1Email: 'sophie@example.com',
          parent1Phone: '0600000009',
          parent2Name: null,
          parent2Email: null,
          parent2Phone: null
        },
        transactions: []
      }
    });

    expect(target.innerHTML).toContain('Aucune coordonnée renseignée.');
    expect(target.innerHTML).toContain('Petit Sophie');
    expect(target.innerHTML).toContain('sophie@example.com');
  });
});
