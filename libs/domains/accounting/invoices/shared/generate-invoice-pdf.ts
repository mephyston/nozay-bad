import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  CONTENT_W,
  FOOTER_TEXT,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawClubFooter,
  drawClubHeader,
  drawParagraph,
  formatFrenchDate,
  wrapLines
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

// Infos club statiques (en dur — changent rarement, cf. décision de plan).
const BANK = {
  titulaire: 'Nozay Badminton',
  nom: 'Société Générale',
  iban: 'FR76 3000 3008 4600 0500 0784 720',
  bic: 'SOGEFRPP'
};
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

  // ---------- EN-TÊTE (club, partagé) ----------
  const ruleY = await drawClubHeader(doc, page, { font, bold });

  // ---------- DESTINATAIRE (bloc à gauche) ----------
  // Un peu d'air entre l'en-tête et le corps de la facture.
  const blockTop = ruleY - 54;
  let recipY = blockTop;
  page.drawText('Destinataire', { x: MARGIN, y: recipY, size: 10, font: bold, color: INK });
  recipY -= 15;
  page.drawText(invoice.clientName, { x: MARGIN, y: recipY, size: 10, font, color: INK });
  for (const line of (invoice.clientAddress || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    recipY -= 13;
    page.drawText(line, { x: MARGIN, y: recipY, size: 10, font, color: INK });
  }

  // ---------- DATE + N° DE FACTURE (à droite, alignés sur le haut du destinataire) ----------
  const rightEdge = PAGE_W - MARGIN;
  const dateStr = `Date : ${formatFrenchDate(invoice.date)}`;
  page.drawText(dateStr, { x: rightEdge - font.widthOfTextAtSize(dateStr, 10), y: blockTop, size: 10, font, color: INK });
  const numStr = `Facture N° ${invoice.invoiceNumber}`;
  page.drawText(numStr, { x: rightEdge - bold.widthOfTextAtSize(numStr, 12), y: blockTop - 18, size: 12, font: bold, color: INK });

  // ---------- LIGNES DE LA FACTURE ----------
  // Tout le détail (objet, personnes, dates…) est porté par la description de
  // chaque ligne. En-tête de tableau, puis lignes avec le montant à droite.
  let y = Math.min(recipY, blockTop - 18) - 42;
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

  // ---------- BLOC BAS (ancré au-dessus du pied de page) ----------
  // Séparateur horizontal pleine largeur, juste au-dessus du texte du pied.
  const footerTopY = MARGIN + (wrapLines(FOOTER_TEXT, font, 9, CONTENT_W).length - 1) * 12;
  const sepY = footerTopY + 16;
  page.drawLine({ start: { x: MARGIN, y: sepY }, end: { x: PAGE_W - MARGIN, y: sepY }, thickness: 0.8, color: GREY });

  // Coordonnées bancaires + mentions, calées en bas du courrier.
  let by = sepY + 108;
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

  // ---------- PIED DE PAGE (club, partagé) ----------
  drawClubFooter(page, { font });

  return doc.save();
}
