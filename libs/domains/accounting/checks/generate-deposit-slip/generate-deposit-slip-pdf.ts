import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import {
  CONTENT_W,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawLetterhead,
  formatFrenchDate,
  loadLetterhead
} from '@nba/pdf';
import type { LetterheadSpec } from '@nba/pdf';
import type { BankDetails } from '@nba/club/settings';

export type DepositSlipCheck = {
  number: string;
  emitter: string;
  bank: string | null;
  amountCents: number;
};

export type DepositSlipData = {
  reference: string;
  date: string;
  amountCents: number;
  status: string;
  checks: DepositSlipCheck[];
};

const LIGHT_GREY = rgb(0.93, 0.93, 0.93);
const RULE_GREY = rgb(0.75, 0.75, 0.75);

/** Centimes → « 1 250,00 € ». */
function formatEuros(cents: number): string {
  const [int, dec] = (cents / 100).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped},${dec} €`;
}

/** Tronque avec « … » pour tenir dans `maxWidth`. */
function ellipsize(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/*
 * Colonnes du tableau : largeurs en points, la dernière (montant) prend le reste.
 * L'émetteur est la cellule longue, elle reçoit le plus de place.
 *
 * Le bordereau est destiné à la banque : elle n'a que faire de l'adhérent rattaché au chèque,
 * une donnée interne au club. La colonne a été retirée, l'émetteur en récupère la largeur.
 */
const COLUMNS = [
  { key: 'index', label: '#', width: 22, align: 'right' as const },
  { key: 'emitter', label: 'Émetteur', width: 200, align: 'left' as const },
  { key: 'bank', label: 'Banque', width: 110, align: 'left' as const },
  { key: 'number', label: 'N° chèque', width: 78, align: 'left' as const },
  { key: 'amount', label: 'Montant', width: 0, align: 'right' as const }
];
const ROW_H = 15;
const CELL_PAD = 4;

/**
 * Bordereau de remise de chèques sur le papier à lettre du club, à joindre au dépôt.
 * Une remise longue tient sur plusieurs feuilles, toutes à l'en-tête du club, l'en-tête
 * du tableau repris à chaque page.
 */
export async function generateDepositSlipPdf(
  data: DepositSlipData,
  spec: LetterheadSpec,
  bank: BankDetails,
  city: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bordereau de remise ${data.reference}`);
  doc.setCreator(spec.clubName);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const letterhead = await loadLetterhead(doc, spec);
  const BRAND = letterhead.brand;

  const rightEdge = PAGE_W - MARGIN;
  const bottomLimit = letterhead.bodyBottom + 14;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  drawLetterhead(page, letterhead, font, bold);
  let y = letterhead.bodyTop - 16;

  function addBlankPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawLetterhead(page, letterhead, font, bold);
    y = letterhead.bodyTop - 20;
  }
  function ensureSpace(needed: number) {
    if (y - needed < bottomLimit) addBlankPage();
  }
  function drawRight(text: string, x: number, size: number, f: PDFFont = font, color: any = INK) {
    page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f, color });
  }

  // ---------- TITRE ----------
  const title = 'BORDEREAU DE REMISE DE CHÈQUES';
  page.drawText(title, { x: MARGIN, y, size: 18, font: bold, color: INK });
  page.drawLine({
    start: { x: MARGIN, y: y - 10 },
    end: { x: MARGIN + bold.widthOfTextAtSize(title, 18), y: y - 10 },
    thickness: 2.5,
    color: BRAND
  });
  y -= 40;

  // ---------- RÉFÉRENCES (gauche) + COMPTE À CRÉDITER (droite) ----------
  const blockTop = y;
  page.drawText('Référence', { x: MARGIN, y, size: 9, font: bold, color: GREY });
  y -= 14;
  page.drawText(data.reference, { x: MARGIN, y, size: 12, font: bold, color: INK });
  y -= 18;
  page.drawText('Date de remise', { x: MARGIN, y, size: 9, font: bold, color: GREY });
  y -= 14;
  page.drawText(formatFrenchDate(data.date), { x: MARGIN, y, size: 11, font, color: INK });
  const leftBottom = y;

  const bankX = MARGIN + CONTENT_W * 0.52;
  y = blockTop;
  page.drawText('Compte à créditer', { x: bankX, y, size: 9, font: bold, color: GREY });
  y -= 14;
  page.drawText(bank.holder, { x: bankX, y, size: 11, font: bold, color: INK });
  y -= 13;
  page.drawText(bank.bank, { x: bankX, y, size: 10, font, color: INK });
  y -= 13;
  page.drawText(`IBAN ${bank.iban}`, { x: bankX, y, size: 9.5, font, color: INK });
  y -= 13;
  page.drawText(`BIC ${bank.bic}`, { x: bankX, y, size: 9.5, font, color: INK });

  y = Math.min(leftBottom, y) - 30;

  // ---------- TABLEAU ----------
  const fixedW = COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const amountW = CONTENT_W - fixedW;
  const colX: number[] = [];
  let cursor = MARGIN;
  for (const col of COLUMNS) {
    colX.push(cursor);
    cursor += col.width || amountW;
  }
  const colW = COLUMNS.map((c) => c.width || amountW);

  function drawCell(i: number, text: string, f: PDFFont, size: number, color: any = INK) {
    const maxW = colW[i] - CELL_PAD * 2;
    const shown = ellipsize(text, f, size, maxW);
    const x = COLUMNS[i].align === 'right'
      ? colX[i] + colW[i] - CELL_PAD - f.widthOfTextAtSize(shown, size)
      : colX[i] + CELL_PAD;
    page.drawText(shown, { x, y: y + 4, size, font: f, color });
  }

  // Chaque rangée occupe la bande [y - ROW_H, y] ; le texte est posé 4 pt au-dessus du bas.
  function tableHeader() {
    page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: CONTENT_W, height: ROW_H, color: LIGHT_GREY });
    y -= ROW_H;
    COLUMNS.forEach((col, i) => drawCell(i, col.label, bold, 8.5, GREY));
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.8, color: GREY });
  }

  page.drawText(`Liste des chèques (${data.checks.length})`, { x: MARGIN, y, size: 9, font: bold, color: GREY });
  y -= 8;
  tableHeader();

  data.checks.forEach((check, idx) => {
    // Une ligne + le total ne doivent pas se retrouver seuls sur une page vide.
    if (y - ROW_H < bottomLimit) {
      addBlankPage();
      tableHeader();
    }
    y -= ROW_H;
    drawCell(0, String(idx + 1), font, 9, GREY);
    drawCell(1, check.emitter, bold, 9);
    drawCell(2, check.bank || '—', font, 9);
    drawCell(3, check.number, font, 9);
    drawCell(4, formatEuros(check.amountCents), font, 9);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.4, color: RULE_GREY });
  });

  if (data.checks.length === 0) {
    y -= ROW_H;
    page.drawText('Aucun chèque dans cette remise.', { x: MARGIN + CELL_PAD, y: y + 4, size: 9, font, color: GREY });
  }

  // ---------- TOTAUX ----------
  ensureSpace(60);
  y -= 22;
  const totLabelX = MARGIN + CONTENT_W * 0.5;
  page.drawText('Nombre de chèques', { x: totLabelX, y, size: 10, font, color: INK });
  drawRight(String(data.checks.length), rightEdge, 10);
  y -= 18;
  page.drawLine({ start: { x: totLabelX, y: y + 12 }, end: { x: rightEdge, y: y + 12 }, thickness: 0.6, color: GREY });
  page.drawText('TOTAL DE LA REMISE', { x: totLabelX, y, size: 11, font: bold, color: INK });
  drawRight(formatEuros(data.amountCents), rightEdge, 13, bold);

  // ---------- SIGNATURE ----------
  ensureSpace(100);
  y -= 44;
  const boxH = 70;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxH + 12,
    width: CONTENT_W,
    height: boxH,
    borderColor: RULE_GREY,
    borderWidth: 0.8
  });
  page.drawText(`Fait à ${city || '________'}, le ____ / ____ / ________`, { x: MARGIN + 12, y, size: 9.5, font, color: INK });
  page.drawText('Signature du trésorier :', { x: MARGIN + CONTENT_W * 0.55, y, size: 9.5, font, color: INK });

  // ---------- PAGINATION (si plusieurs feuilles) ----------
  const pages = doc.getPages();
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const label = `Page ${i + 1} / ${pages.length}`;
      p.drawText(label, {
        x: rightEdge - font.widthOfTextAtSize(label, 8),
        y: letterhead.bodyBottom + 2,
        size: 8,
        font,
        color: GREY
      });
    });
  }

  return doc.save();
}
