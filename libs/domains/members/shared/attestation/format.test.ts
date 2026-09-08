import { describe, it, expect } from 'vitest';
import { numberToFrenchWords, formatFrenchDate, formatSeason, paymentMethodLabel, seasonIssueDate, cotisationSentence } from './format';

describe('numberToFrenchWords', () => {
  it.each([
    [0, 'zéro'],
    [1, 'un'],
    [16, 'seize'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [100, 'cent'],
    [128, 'cent vingt-huit'],
    [200, 'deux cents'],
    [280, 'deux cent quatre-vingts'],
    [999, 'neuf cent quatre-vingt-dix-neuf']
  ])('convertit %i → "%s"', (n, expected) => {
    expect(numberToFrenchWords(n)).toBe(expected);
  });
});

describe('formatFrenchDate', () => {
  it('formate une date ISO', () => {
    expect(formatFrenchDate('1974-09-21')).toBe('21 septembre 1974');
  });
  it('renvoie une chaîne vide pour le placeholder', () => {
    expect(formatFrenchDate('date de validation')).toBe('');
  });
});

describe('formatSeason', () => {
  it('développe la forme courte', () => {
    expect(formatSeason('24-25')).toBe('2024-2025');
  });
  it('laisse une saison déjà complète', () => {
    expect(formatSeason('2024-2025')).toBe('2024-2025');
  });
});

describe('seasonIssueDate', () => {
  it('renvoie le 1er septembre de la saison au format court', () => {
    expect(seasonIssueDate('24-25')).toBe('2024-09-01');
  });
  it('accepte une saison déjà complète', () => {
    expect(seasonIssueDate('2024-2025')).toBe('2024-09-01');
  });
  it('renvoie une chaîne vide si la saison est absente ou illisible', () => {
    expect(seasonIssueDate('')).toBe('');
    expect(seasonIssueDate('saison')).toBe('');
  });
});

describe('paymentMethodLabel', () => {
  it('mappe une clé connue', () => {
    expect(paymentMethodLabel('virement')).toBe('virement bancaire');
  });
  it('renvoie la clé brute si inconnue', () => {
    expect(paymentMethodLabel('bitcoin')).toBe('bitcoin');
  });
});

describe('cotisationSentence', () => {
  it('dit que la cotisation a été réglée quand elle est soldée', () => {
    expect(cotisationSentence({ amount: 15000, amountReceived: 15000, season: '25-26', paymentMethod: 'virement' })).toBe(
      "est adhérent(e) à notre association pour la pratique du badminton. Sa cotisation pour la saison sportive 2025-2026 s'élève à 150€ (cent cinquante euros) et a été réglée par virement bancaire."
    );
  });

  /*
    L'attestation certifie ce qui a été payé : un règlement partiel dit les deux montants,
    pour qu'un comité d'entreprise rembourse sur le bon.
  */
  it('dit le montant réglé à ce jour quand le solde reste ouvert', () => {
    expect(cotisationSentence({ amount: 15000, amountReceived: 10000, season: '25-26', paymentMethod: 'cheque' })).toBe(
      "est adhérent(e) à notre association pour la pratique du badminton. Sa cotisation pour la saison sportive 2025-2026 s'élève à 150€ (cent cinquante euros), dont 100€ (cent euros) ont été réglés à ce jour par chèque."
    );
  });

  it('ne parle pas de solde pour un trop-perçu', () => {
    expect(cotisationSentence({ amount: 15000, amountReceived: 16000, season: '25-26', paymentMethod: 'especes' })).toContain(
      'et a été réglée par espèces.'
    );
  });
});
