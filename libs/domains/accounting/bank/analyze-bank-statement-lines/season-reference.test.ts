import { describe, it, expect } from 'vitest';
import { isFutureSeason, seasonInText } from './season-reference';

describe('saison citée dans un libellé bancaire', () => {
  it('reconnaît les formes courtes et longues', () => {
    expect(seasonInText('VIR COTISATION 26-27 DUPONT')).toBe('26-27');
    expect(seasonInText('virement adhesion 2026/2027')).toBe('26-27');
    expect(seasonInText('ADHESION 2026 2027')).toBe('26-27');
    expect(seasonInText('cotisation 26/27')).toBe('26-27');
  });

  it('n’invente pas une saison à partir de deux nombres quelconques', () => {
    // Le piège : un numéro de rue, une plage, un identifiant. Seuls deux millésimes
    // CONTIGUS font une saison.
    expect(seasonInText('VIR 26-30 RUE DES SPORTS')).toBeNull();
    expect(seasonInText('PAIEMENT 12-45')).toBeNull();
    expect(seasonInText('REF 2026-2028')).toBeNull();
  });

  it('rend null quand rien ne ressemble à une saison', () => {
    expect(seasonInText('VIREMENT DUPONT JEAN')).toBeNull();
    expect(seasonInText('')).toBeNull();
  });

  it('passe le siècle sans se tromper', () => {
    expect(seasonInText('cotisation 99-00')).toBe('99-00');
    expect(seasonInText('cotisation 2099/2100')).toBe('99-00');
  });

  it('compare deux saisons par leur millésime de départ', () => {
    expect(isFutureSeason('26-27', '25-26')).toBe(true);
    expect(isFutureSeason('25-26', '25-26')).toBe(false);
    // Une saison antérieure n'est pas un produit constaté d'avance : c'est un
    // encaissement tardif, qui appartient bien à l'exercice qui le reçoit.
    expect(isFutureSeason('24-25', '25-26')).toBe(false);
  });

  it('ignore une date en tête de libellé et retient la saison qui suit', () => {
    expect(seasonInText('vir 16/06 cotisation 26-27 renard')).toBe('26-27');
  });

  it('lit un millésime collé au libellé, comme dans un motif de virement', () => {
    expect(seasonInText('motif: fosse-jules-adhesion2026-2027 ref: not provided')).toBe('26-27');
  });

  it("ne lit pas de saison dans une date ni dans un identifiant de virement", () => {
    expect(seasonInText('de: mr fosse jules date: 21/08/2026 18:09')).toBeNull();
    expect(seasonInText('14426333000300846000500078472020260821')).toBeNull();
  });
});
