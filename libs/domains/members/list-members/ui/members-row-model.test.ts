import { describe, it, expect } from 'vitest';
import { ligneAdherent, membershipStatusTone } from './members-row-model';
import type { Member } from './members-table-types';

const ADHERENT: Member = {
  id: 1,
  licence: '07512345',
  lastName: 'Dupont',
  firstName: 'Marie',
  gender: 'F',
  birthDate: '1990-04-12',
  status: 'valide',
  type: 'Competiteur',
  paid: true,
};

describe('ligneAdherent', () => {
  it('identifie par le nom, situe par la licence, et porte le statut à droite', () => {
    const ligne = ligneAdherent(ADHERENT, '25-26');
    expect(ligne.titre).toBe('Dupont Marie');
    expect(ligne.sousTitre).toBe('Licence 07512345');
    expect(ligne.valeur).toBe('Validé');
    expect(ligne.ton).toBe('success');
  });

  it('emporte la saison dans le lien, sans quoi la fiche changerait d’exercice', () => {
    expect(ligneAdherent(ADHERENT, '24-25').href).toBe('/admin/members/07512345?season=24-25');
  });

  it('donne un ton à chaque statut, et retombe sur le neutre pour un inconnu', () => {
    expect(membershipStatusTone('incomplet')).toBe('warning');
    expect(membershipStatusTone('suspendu')).toBe('destructive');
    expect(membershipStatusTone('en_attente')).toBe('muted');
    expect(membershipStatusTone('zarbi')).toBe('muted');
  });
});
