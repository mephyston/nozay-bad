import { describe, it, expect } from 'vitest';
import { searchNav } from '@nba/ui';
import { storefrontNavGroups } from './nav';

const session = {
  members: [{ id: 7, firstName: 'Jean', lastName: 'Dupont', licence: '7104079', paid: true, expenseAuthorized: true }],
  activeMemberId: 7
};

describe('storefrontNavGroups', () => {
  it('liste les onglets et les entrées du compte, la licence complétée à huit chiffres', () => {
    const groups = storefrontNavGroups({ features: {}, session });
    expect(groups.map((g) => g.label)).toEqual(['Espace adhérent', 'Mon compte']);
    expect(groups[1].items.find((i) => i.name === 'Ma fiche')?.href).toBe('/adherents/07104079');
    expect(groups[1].items.map((i) => i.name)).toContain('Notes de frais');
  });

  it('retire ce que le club a éteint et ce que le profil ne peut pas voir', () => {
    const groups = storefrontNavGroups({
      features: { shop: false, teams: false, attestations: false, push: false },
      session: { ...session, members: [{ ...session.members[0], expenseAuthorized: false }] }
    });
    expect(groups[0].items.map((i) => i.name)).toEqual(['Accueil', 'Actualités', 'Calendrier']);
    expect(groups[1].items.map((i) => i.name)).toEqual(['Mon compte', 'Ma fiche', 'Ma cotisation', 'Historique de commandes']);
  });

  it('se laisse chercher par mot-clé', () => {
    const groups = storefrontNavGroups({ features: {}, session });
    expect(searchNav(groups, [], 'cse')[0].name).toBe('Mon attestation CSE');
    expect(searchNav(groups, [], 'historique')[0].name).toBe('Historique de commandes');
    expect(searchNav(groups, [], 'annuaire')[0].name).toBe('Mon club');
  });
});
