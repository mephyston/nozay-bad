import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDepositSlip } from './handler';

const getDepositWithChecks = vi.hoisted(() => vi.fn());

vi.mock('@nba/club/settings', () => ({
  clubLetterhead: async () => ({ clubName: 'Club Test', legalLines: [], brand: { type: 'RGB', red: 0.3, green: 0.3, blue: 0.3 } }),
  getClubSettings: async () => ({ city: 'Testville', bankHolder: 'Club Test', bankName: 'Banque', iban: 'FR76', bic: 'TESTFRPP' }),
  bankDetails: (s: any) => ({ holder: s.bankHolder, bank: s.bankName, iban: s.iban, bic: s.bic })
}));
/** Magasin d'images vide : le handler n'en lit pas dans ce test. */
const MAGASIN = { has: async () => false, put: async () => {}, get: async () => null };

vi.mock('./repository', () => ({
  GenerateDepositSlipRepository: class {
    getDepositWithChecks = getDepositWithChecks;
  }
}));

describe('generateDepositSlip', () => {
  beforeEach(() => {
    getDepositWithChecks.mockReset();
  });

  it('renvoie 404 pour une remise inconnue', async () => {
    getDepositWithChecks.mockResolvedValue(undefined);
    await expect(generateDepositSlip({} as any, MAGASIN, 42)).rejects.toMatchObject({ status: 404 });
  });

  it('nomme le fichier d\'après la référence, en ASCII sûr pour Content-Disposition', async () => {
    getDepositWithChecks.mockResolvedValue({
      reference: 'REMISE-20260315-3 (été)', date: '2026-03-15', amountCents: 4200, status: 'deposited',
      checks: [{ number: '1234567', emitter: 'Durand', bank: 'LCL', amountCents: 4200 }]
    });

    const { pdf, filename } = await generateDepositSlip({} as any, MAGASIN, 3);

    expect(filename).toBe('Bordereau-REMISE-20260315-3-ete.pdf');
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
  });
});
