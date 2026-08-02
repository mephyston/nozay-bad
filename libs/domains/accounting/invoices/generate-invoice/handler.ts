import { type Db } from '@nba/db';
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

export async function generateInvoice(db: Db, id: number): Promise<GenerateInvoiceOutput> {
  // getInvoice renvoie `{ ...invoice, items }` (et lève InvoiceNotFoundError).
  const data = await getInvoice(db, id);
  const items: InvoiceItem[] = (data as any).items ?? [];
  const pdf = await generateInvoicePdf(data, items);
  return { pdf, filename: safeFilename(data.invoiceNumber) };
}
