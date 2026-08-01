import { PDFDocument, PDFFont, PDFImage, PDFPage, PageSizes, rgb } from 'pdf-lib';
import type { EmbeddedImage } from './assets';

// --- géométrie partagée (A4 portrait, origine en bas-gauche) ---
export const [PAGE_W, PAGE_H] = PageSizes.A4;
export const MARGIN = 56;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export const INK = rgb(0.09, 0.11, 0.17);
export const GREY = rgb(0.37, 0.37, 0.37);

// Ligne partenaires du pied de page club (identique attestation/facture).
export const FOOTER_TEXT =
  "Nos Partenaires : Ville de Nozay – Conseil Départemental de l'Essonne – ANS du Ministère des Sports, de la Jeunesse, de l'Education Populaire et de la Vie Associative – Babolat – J2S – Lardesport – Société Générale";

export const embed = (doc: PDFDocument, a: EmbeddedImage): Promise<PDFImage> =>
  a.kind === 'png' ? doc.embedPng(a.base64) : doc.embedJpg(a.base64);

/** Découpe un texte en lignes qui tiennent dans `maxWidth`. */
export function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Dessine un paragraphe justifié à gauche et renvoie le nouveau `y` (bas de bloc). */
export function drawParagraph(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; maxWidth: number; font: PDFFont; size: number; lineHeight: number; color?: any }
): number {
  let y = opts.y;
  for (const line of wrapLines(text, opts.font, opts.size, opts.maxWidth)) {
    page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color ?? INK });
    y -= opts.lineHeight;
  }
  return y;
}

/** Dessine une image calée sur une hauteur cible, ancrée par son coin haut-gauche. */
export function drawImageAtHeight(page: PDFPage, img: PDFImage, x: number, topY: number, targetH: number): { width: number } {
  const width = (img.width / img.height) * targetH;
  page.drawImage(img, { x, y: topY - targetH, width, height: targetH });
  return { width };
}

/** Ajuste une image DANS une cellule (contain) et la centre. */
export function drawImageInCell(page: PDFPage, img: PDFImage, cellX: number, cellTopY: number, cellW: number, cellH: number): void {
  const scale = Math.min(cellW / img.width, cellH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, {
    x: cellX + (cellW - w) / 2,
    y: cellTopY - cellH + (cellH - h) / 2,
    width: w,
    height: h
  });
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/** ISO `YYYY-MM-DD` → `16 mai 2026`. Renvoie la chaîne d'origine si non parsable. */
export function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthName = MONTHS[monthNum - 1] || parts[1];
  return `${day} ${monthName} ${parts[0]}`;
}
