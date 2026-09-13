import { type Db } from '@nba/db';
import { bankDetails, clubLetterhead, getClubSettings, type ClubAssetStore } from '@nba/club/settings';
import { getInvoice } from '../get-invoice/handler';
import { generateInvoicePdf, type InvoiceItem } from '../shared/generate-invoice-pdf';

export type GenerateInvoiceOutput = {
  pdf: Uint8Array;
  filename: string;
};

/** Nom de fichier sûr (ASCII, sans caractères problématiques pour Content-Disposition). */
function safeFilename(invoiceNumber: string): string {
  const base = `Facture ${invoiceNumber}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base}.pdf`;
}

export async function generateInvoice(db: Db, store: ClubAssetStore, id: number): Promise<GenerateInvoiceOutput> {
  // getInvoice renvoie `{ ...invoice, items }` (et lève InvoiceNotFoundError).
  const data = await getInvoice(db, id);
  const items: InvoiceItem[] = (data as any).items ?? [];
  const [spec, settings] = await Promise.all([clubLetterhead(db, store), getClubSettings(db)]);
  const pdf = await generateInvoicePdf(data, items, spec, bankDetails(settings));
  return { pdf, filename: safeFilename(data.invoiceNumber) };
}
