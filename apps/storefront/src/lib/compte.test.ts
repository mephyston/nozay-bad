import { describe, it, expect } from 'vitest';
import { eur, dateFr, libelleDeStatut, classeDeStatut, montantsDeCotisation } from './compte';

describe('eur', () => {
  it('écrit des centimes en euros', () => {
    expect(eur(1234).replace(/ | /g, ' ')).toBe('12,34 €');
  });

  it('tolère une absence de montant', () => {
    expect(eur(undefined as any).replace(/ | /g, ' ')).toBe('0,00 €');
  });
});

describe('dateFr', () => {
  it('rend une date française', () => {
    expect(dateFr('2026-09-24T10:00:00Z')).toBe('24/09/2026');
  });

  it("rend une chaîne vide plutôt qu'« Invalid Date »", () => {
    expect(dateFr('pas une date')).toBe('');
    expect(dateFr(null)).toBe('');
  });
});

describe('libelleDeStatut', () => {
  it('traduit un statut connu', () => {
    expect(libelleDeStatut('awaiting_payment')).toBe('À régler');
  });

  it('rend le code brut plutôt que rien', () => {
    expect(libelleDeStatut('exotique')).toBe('exotique');
  });
});

describe('classeDeStatut', () => {
  it('réserve la couleur d’alerte à ce qui appelle une action', () => {
    expect(classeDeStatut('awaiting_payment')).toContain('warning');
    expect(classeDeStatut('paid')).toContain('success');
  });

  it('se rabat sur le ton neutre', () => {
    expect(classeDeStatut('exotique')).toBe(classeDeStatut('created'));
  });
});

describe('montantsDeCotisation', () => {
  it('lit les montants de l’API', () => {
    expect(montantsDeCotisation({ amountDueCents: 12000, amountReceivedCents: 5000, amountRemainingCents: 7000, paid: false }))
      .toEqual({ du: 12000, recu: 5000, restant: 7000, aJour: false });
  });

  it('recalcule le restant quand l’API ne le donne pas', () => {
    expect(montantsDeCotisation({ amountDueCents: 12000, amountReceivedCents: 5000 }).restant).toBe(7000);
  });

  it('ne rend jamais un restant négatif : un trop-perçu n’est pas une dette à rebours', () => {
    expect(montantsDeCotisation({ amountDueCents: 5000, amountReceivedCents: 8000 }).restant).toBe(0);
  });

  it('sans cotisation, tout est à zéro', () => {
    expect(montantsDeCotisation(null)).toEqual({ du: 0, recu: 0, restant: 0, aJour: false });
  });
});
