import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  BRAND,
  CONTENT_W,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawLetterhead,
  drawParagraph,
  formatFrenchDate,
  loadLetterhead
} from '@nba/pdf';

// Données issues de get-invoice (invoicesTable + items).
export type InvoiceData = {
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientAddress: string | null;
  // 'draft' | 'sent' | 'paid' | 'cancelled' — 'sent' = en attente de règlement.
  status: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
};

import { CLUB_BANK as BANK } from '../../shared/club-bank';

const REGLEMENT = 'Virement';

// Mention d'exonération de TVA (association à but non lucratif). À confirmer.
const TVA_MENTION = 'TVA non applicable, art. 261-7-1° du CGI (association à but non lucratif).';

/** Centimes → « 50,00 € » (format français). */
function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export async function generateInvoicePdf(invoice: InvoiceData, items: InvoiceItem[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${invoice.invoiceNumber}`);
  doc.setCreator('Nozay Badminton Association');
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ---------- PAPIER À LETTRE (club, partagé) ----------
  const letterhead = await loadLetterhead(doc);
  drawLetterhead(page, letterhead, font);

  const rightEdge = PAGE_W - MARGIN;
  const blockTop = letterhead.bodyTop;

  // ---------- TITRE + RÉFÉRENCES (à gauche) ----------
  page.drawText('FACTURE', { x: MARGIN, y: blockTop - 16, size: 22, font: bold, color: INK });
  page.drawLine({
    start: { x: MARGIN, y: blockTop - 26 },
    end: { x: MARGIN + bold.widthOfTextAtSize('FACTURE', 22), y: blockTop - 26 },
    thickness: 2.5,
    color: BRAND
  });
  let refY = blockTop - 48;
  page.drawText(`N° ${invoice.invoiceNumber}`, { x: MARGIN, y: refY, size: 12, font: bold, color: INK });
  refY -= 16;
  page.drawText(`Date : ${formatFrenchDate(invoice.date)}`, { x: MARGIN, y: refY, size: 10, font, color: GREY });

  // ---------- DESTINATAIRE (bloc à droite, côté fenêtre d'enveloppe) ----------
  const recipX = MARGIN + CONTENT_W * 0.52;
  let recipY = blockTop - 16;
  page.drawText('Destinataire', { x: recipX, y: recipY, size: 9, font: bold, color: GREY });
  recipY -= 16;
  page.drawText(invoice.clientName, { x: recipX, y: recipY, size: 11, font: bold, color: INK });
  for (const line of (invoice.clientAddress || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    recipY -= 13;
    page.drawText(line, { x: recipX, y: recipY, size: 10, font, color: INK });
  }

  // ---------- LIGNES DE LA FACTURE ----------
  // Tout le détail (objet, personnes, dates…) est porté par la description de
  // chaque ligne. En-tête de tableau, puis lignes avec le montant à droite.
  let y = Math.min(recipY, refY) - 42;
  page.drawText('Description', { x: MARGIN, y, size: 9, font: bold, color: GREY });
  const montantHeader = 'Montant';
  page.drawText(montantHeader, { x: rightEdge - bold.widthOfTextAtSize(montantHeader, 9), y, size: 9, font: bold, color: GREY });
  y -= 7;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.6, color: GREY });
  y -= 18;

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.totalPriceCents;
    const amt = formatEuros(item.totalPriceCents);
    page.drawText(amt, { x: rightEdge - font.widthOfTextAtSize(amt, 10), y, size: 10, font, color: INK });
    y = drawParagraph(page, item.description, { x: MARGIN, y, maxWidth: CONTENT_W - 90, font, size: 10, lineHeight: 14 });
    y -= 10;
  }

  // ---------- TOTAUX (bloc à droite, façon modèle) ----------
  y -= 8;
  const totLabelX = MARGIN + CONTENT_W * 0.45;
  const totalsRow = (label: string, value: string, opts?: { bold?: boolean; size?: number; gap?: number }) => {
    const size = opts?.size ?? 10;
    const f = opts?.bold ? bold : font;
    page.drawText(label, { x: totLabelX, y, size, font: f, color: INK });
    page.drawText(value, { x: rightEdge - f.widthOfTextAtSize(value, size), y, size, font: f, color: INK });
    y -= opts?.gap ?? 17;
  };
  totalsRow('Sous-total HT', formatEuros(subtotal));
  totalsRow('Montant Total EUR', formatEuros(subtotal), { bold: true });

  // Séparateur horizontal de la largeur du bloc montants.
  y -= 4;
  page.drawLine({ start: { x: totLabelX, y: y + 10 }, end: { x: rightEdge, y: y + 10 }, thickness: 0.6, color: GREY });
  y -= 10;

  const isPaid = invoice.status === 'paid';
  totalsRow('Montant payé', formatEuros(isPaid ? subtotal : 0));
  totalsRow('Montant à payer (EUR)', formatEuros(isPaid ? 0 : subtotal), { bold: true, size: 13 });

  // ---------- RÈGLEMENT + MENTION TVA (sous le total) ----------
  y -= 30;
  page.drawText(`Règlement : ${REGLEMENT}`, { x: MARGIN, y, size: 10.5, font, color: INK });
  y -= 15;
  page.drawText(TVA_MENTION, { x: MARGIN, y, size: 9.5, font, color: GREY });

  // ---------- BLOC BAS (ancré juste au-dessus du papier à lettre) ----------
  // Coordonnées bancaires + mentions, calées en bas du courrier. Le filet du bas de
  // page est déjà porté par le papier à lettre : en ajouter un second ferait doublon.
  let by = letterhead.bodyBottom + 92;
  page.drawText('Coordonnées bancaires :', { x: MARGIN, y: by, size: 10.5, font: bold, color: INK });
  by -= 16;
  const bankLine = (label: string, value: string) => {
    page.drawText(label, { x: MARGIN + 12, y: by, size: 10, font, color: GREY });
    page.drawText(value, { x: MARGIN + 70, y: by, size: 10, font, color: INK });
    by -= 14;
  };
  bankLine('Titulaire', BANK.titulaire);
  bankLine('Nom', BANK.nom);
  bankLine('IBAN', BANK.iban);
  bankLine('BIC', BANK.bic);
  by -= 12;
  page.drawText("Merci d'indiquer le numéro de facture dans le motif du virement.", { x: MARGIN, y: by, size: 9.5, font, color: GREY });

  return doc.save();
}
