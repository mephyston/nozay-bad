import { AppError, type Db } from '@nba/db';
import { GenerateDepositSlipRepository } from './repository';
import { generateDepositSlipPdf } from './generate-deposit-slip-pdf';

export type GenerateDepositSlipOutput = {
  pdf: Uint8Array;
  filename: string;
};

/** Nom de fichier sûr (ASCII, sans caractères problématiques pour Content-Disposition). */
function safeFilename(reference: string): string {
  const base = `Bordereau ${reference}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base}.pdf`;
}

export async function generateDepositSlip(db: Db, id: number): Promise<GenerateDepositSlipOutput> {
  const repo = new GenerateDepositSlipRepository();
  const data = await repo.getDepositWithChecks(db, id);
  if (!data) {
    throw new AppError('Remise de chèques non trouvée.', 404);
  }
  const pdf = await generateDepositSlipPdf(data);
  return { pdf, filename: safeFilename(data.reference) };
}
