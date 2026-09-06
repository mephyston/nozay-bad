import { describe, it, expect } from 'vitest';
import { deriveMembershipStatus, membershipGrantsAccess, membershipStatusLabel } from './membership-status';

const withPayment = (over: Partial<Parameters<typeof deriveMembershipStatus>[0]>) =>
  deriveMembershipStatus({
    rawStatus: 'Oui',
    hasPaymentColumns: true,
    paid: false,
    amountReceivedCents: 0,
    amountRemainingCents: 0,
    ...over
  });

describe('deriveMembershipStatus', () => {
  it('cotisation soldée → validé', () => {
    expect(withPayment({ paid: true, amountReceivedCents: 25000, amountRemainingCents: 0 })).toBe('valide');
    // Poona peut ne pas cocher « Payé » alors que plus rien n'est dû.
    expect(withPayment({ paid: false, amountReceivedCents: 25000, amountRemainingCents: 0 })).toBe('valide');
  });

  it('un versement reçu mais un reste dû → paiement partiel', () => {
    expect(withPayment({ amountReceivedCents: 10000, amountRemainingCents: 15000 })).toBe('incomplet');
  });

  it('rien reçu → en attente de paiement, jamais « suspendu »', () => {
    expect(withPayment({ amountReceivedCents: 0, amountRemainingCents: 20000 })).toBe('en_attente');
    expect(withPayment({ rawStatus: 'Non', amountReceivedCents: 0, amountRemainingCents: 20000 })).toBe('en_attente');
  });

  it('un dossier annulé reste suspendu, quel que soit le règlement', () => {
    expect(withPayment({ rawStatus: 'Non', rawDossier: 'Dossier annulé', paid: true, amountReceivedCents: 25000 })).toBe('suspendu');
    expect(withPayment({ rawStatus: 'suspendu', paid: true })).toBe('suspendu');
  });

  it("sans colonnes de règlement, l'export ne dit rien du paiement : dossier finalisé → validé, « Non » → en attente", () => {
    const minimal = (rawStatus: string, rawDossier = '') =>
      deriveMembershipStatus({ rawStatus, rawDossier, hasPaymentColumns: false, paid: false, amountReceivedCents: 0, amountRemainingCents: 0 });
    expect(minimal('Oui', 'Dossier finalisé')).toBe('valide');
    expect(minimal('valide')).toBe('valide');
    expect(minimal('Non', 'Dossier en cours')).toBe('en_attente');
    expect(minimal('Non', 'Dossier annulé')).toBe('suspendu');
  });
});

describe('membershipGrantsAccess', () => {
  it("ouvre l'espace adhérent dès un versement, même partiel", () => {
    expect(membershipGrantsAccess('valide')).toBe(true);
    expect(membershipGrantsAccess('incomplet')).toBe(true);
  });

  it('le ferme sans versement ou sur dossier annulé', () => {
    expect(membershipGrantsAccess('en_attente')).toBe(false);
    expect(membershipGrantsAccess('suspendu')).toBe(false);
  });
});

describe('membershipStatusLabel', () => {
  it('traduit chaque statut et rend la valeur brute à défaut', () => {
    expect(membershipStatusLabel('valide')).toBe('Validé');
    expect(membershipStatusLabel('incomplet')).toBe('Paiement partiel');
    expect(membershipStatusLabel('en_attente')).toBe('En attente de paiement');
    expect(membershipStatusLabel('suspendu')).toBe('Suspendu');
    expect(membershipStatusLabel('inconnu')).toBe('inconnu');
  });
});
