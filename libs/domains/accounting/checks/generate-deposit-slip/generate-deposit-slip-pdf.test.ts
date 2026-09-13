import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateDepositSlipPdf, type DepositSlipData } from './generate-deposit-slip-pdf';
import { bareLetterhead } from '@nba/pdf';

const BANQUE = { holder: 'Club Test', bank: 'Banque Test', iban: 'FR76 0000', bic: 'TESTFRPP' };

function remise(nbCheques: number): DepositSlipData {
  const checks = Array.from({ length: nbCheques }, (_, i) => ({
    number: String(1000000 + i),
    emitter: `Émetteur ${i + 1} avec un nom particulièrement long pour forcer la troncature`,
    bank: i % 3 === 0 ? null : 'Crédit Agricole',
    amountCents: 1250 * (i + 1)
  }));
  return {
    reference: `REMISE-20260315-${nbCheques}`,
    date: '2026-03-15',
    amountCents: checks.reduce((sum, c) => sum + c.amountCents, 0),
    status: 'deposited',
    checks
  };
}

describe('generateDepositSlipPdf', () => {
  it('tient sur une page pour une remise ordinaire', async () => {
    const pdf = await generateDepositSlipPdf(remise(12), bareLetterhead('Club Test'), BANQUE, 'Testville');
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe('Bordereau de remise REMISE-20260315-12');
  });

  it("continue sur une seconde feuille à l'en-tête du club quand la liste déborde", async () => {
    const pdf = await generateDepositSlipPdf(remise(60), bareLetterhead('Club Test'), BANQUE, 'Testville');
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it('accepte une remise sans chèque', async () => {
    const pdf = await generateDepositSlipPdf(remise(0), bareLetterhead('Club Test'), BANQUE, 'Testville');
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
  });
});
