import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import MemberProfileInfoTab from './MemberProfileInfoTab.svelte';
import type { Member } from './member-profile-types';

/**
 * La fiche adhérent s'ouvre sur `members:members:read`, mais elle portait deux
 * commandes d'écriture — l'éditeur de fonction au club et la bascule « note de frais » —
 * offertes à tout le monde. Un entraîneur les voyait et récoltait un 403.
 *
 * L'API reste l'autorité ; ces tests gardent la promesse de l'écran : ne proposer que
 * ce que le compte peut faire.
 */
describe('MemberProfileInfoTab — gardes de permission', () => {
  const member: Member = {
    id: 1,
    licence: '07712345',
    lastName: 'Curie',
    firstName: 'Marie',
    gender: 'F',
    birthDate: '1990-05-04',
    email: 'marie@example.com',
    phone: null,
    status: 'Actif',
    type: 'Compétiteur adulte',
    importedAt: '2026-08-01T10:00:00.000Z',
    paid: true,
    expenseAuthorized: false
  };

  function render(props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(MemberProfileInfoTab, { target, props: { member, season: '25-26', ...props } });
    flushSync();
    return target;
  }

  it('sans le droit d’écriture : aucune commande, la fonction reste lisible', () => {
    const target = render({ clubFunctions: ['treasurer'], canWrite: false });

    expect(target.innerHTML).toContain('Trésorier');
    expect(target.innerHTML).not.toContain('Enregistrer');
    expect(target.innerHTML).not.toContain('Autoriser');
  });

  it('sans le droit d’écriture et sans fonction : le dit, plutôt qu’une grille inerte', () => {
    const target = render({ clubFunctions: [], canWrite: false });

    expect(target.innerHTML).toContain('Aucune fonction au club cette saison.');
    expect(target.innerHTML).not.toContain('Enregistrer');
  });

  it('avec le droit d’écriture : les deux commandes reviennent', () => {
    const target = render({ clubFunctions: [], canWrite: true });

    expect(target.innerHTML).toContain('Enregistrer');
    expect(target.innerHTML).toContain('Autoriser');
    expect(target.innerHTML).toContain("Membre du comité d'administration");
  });
});
