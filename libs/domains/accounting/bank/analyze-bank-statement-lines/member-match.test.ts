import { describe, it, expect } from 'vitest';
import { pickMemberCandidate, includesWord } from './member-match';

const morgane = { id: 623, firstName: 'Morgane', lastName: 'RENARD', parent1Name: 'RENARD Sylvain (Parent)', parent2Name: 'RENARD Sylvain (Parent)' };
const sylvain = { id: 624, firstName: 'Sylvain', lastName: 'RENARD', parent1Name: null, parent2Name: null };

describe('pickMemberCandidate', () => {
  const payerPaysOwnLicence =
    'vir inst re 673390599511 de: m renard sylvain motif: paiement licence sylvain renard';

  it("retient l'adhérent nommé plutôt que celui dont il est le parent", () => {
    // L'enfant précède le parent en base : sans départage, l'ordre des lignes décidait.
    const { candidate } = pickMemberCandidate([morgane, sylvain], payerPaysOwnLicence);
    expect(candidate?.id).toBe(624);
  });

  it('tient la désignation pour certaine quand un seul adhérent est nommé', () => {
    const { certain } = pickMemberCandidate([morgane, sylvain], payerPaysOwnLicence);
    expect(certain?.id).toBe(624);
  });

  it('rend la main quand le motif nomme un second adhérent', () => {
    const text = 'de: m renard sylvain motif: cotisation morgane renard';
    const { certain } = pickMemberCandidate([morgane, sylvain], text);
    expect(certain).toBeNull();
  });

  it("retombe sur le nom du parent quand l'adhérent n'est pas nommé", () => {
    const text = 'de: m renard sylvain motif: cotisation annuelle';
    const { candidate, certain } = pickMemberCandidate([morgane], text);
    expect(candidate?.id).toBe(623);
    expect(certain).toBeNull();
  });

  it('ne lit pas un prénom au milieu d’un autre mot', () => {
    expect(includesWord('paiement marcel dupont', 'marc')).toBe(false);
    expect(includesWord('paiement marc dupont', 'marc')).toBe(true);
    expect(includesWord('motif: marc-dupont-adhesion', 'marc')).toBe(true);
  });
});
