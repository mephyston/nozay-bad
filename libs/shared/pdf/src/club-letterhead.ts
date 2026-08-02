import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import * as A from './assets';
import {
  CONTENT_W,
  FOOTER_TEXT,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawImageAtHeight,
  drawImageInCell,
  embed,
  wrapLines
} from './helpers';

export type ClubFonts = { font: PDFFont; bold: PDFFont };

/**
 * En-tête club (logo NBA + bloc identité + grille partenaires 2×2), commun à
 * l'attestation et à la facture. Renvoie `ruleY` : la coordonnée y sous laquelle
 * le corps du document peut commencer.
 */
export async function drawClubHeader(doc: PDFDocument, page: PDFPage, fonts: ClubFonts): Promise<number> {
  const { font, bold } = fonts;
  const [clubLogo, efb, essonne, idf, nozay] = await Promise.all([
    embed(doc, A.clubLogo),
    embed(doc, A.logoEfb),
    embed(doc, A.logoEssonne),
    embed(doc, A.logoIdf),
    embed(doc, A.logoNozay)
  ]);

  const headerTop = PAGE_H - MARGIN;
  const logoH = 84;
  const logo = drawImageAtHeight(page, clubLogo, MARGIN, headerTop, logoH);

  // Bloc identité à droite du logo.
  const idX = MARGIN + logo.width + 16;
  page.drawText('Nozay Badminton Association', { x: idX, y: headerTop - 12, size: 12.5, font: bold, color: INK });
  const idLines = [
    'Adresse : Mairie de Nozay, 91620 NOZAY',
    'Site web : www.nozaybad.fr',
    'Association N° 0913011863',
    'Siret : 433 218 716 00010',
    'Agrément DDJS : 91 S 744',
    'Affiliation FFBaD : LIFB.91.96.018'
  ];
  const idStep = 10.5;
  let iy = headerTop - logoH + (idLines.length - 1) * idStep;
  for (const line of idLines) {
    page.drawText(line, { x: idX, y: iy, size: 8.5, font, color: GREY });
    iy -= idStep;
  }

  // Logos partenaires en grille 2×2, en haut à droite.
  const cellW = 74;
  const gap = 8;
  const topH = 44;
  const botH = 32;
  const col1X = PAGE_W - MARGIN - (2 * cellW + gap);
  const col2X = col1X + cellW + gap;
  const row1Y = headerTop;
  const row2Y = headerTop - topH - gap;
  drawImageInCell(page, efb, col1X, row1Y, cellW, topH);
  drawImageInCell(page, essonne, col2X, row1Y, cellW, topH);
  drawImageInCell(page, idf, col1X, row2Y, cellW, botH);
  drawImageInCell(page, nozay, col2X, row2Y, cellW, botH);

  return headerTop - 92;
}

/** Pied de page club (ligne « Nos Partenaires : … »), commun à l'attestation et à la facture. */
export function drawClubFooter(page: PDFPage, fonts: Pick<ClubFonts, 'font'>): void {
  const { font } = fonts;
  const footerSize = 9;
  const footerLines = wrapLines(FOOTER_TEXT, font, footerSize, CONTENT_W);
  const footerLineH = 12;
  const footerTopY = MARGIN + (footerLines.length - 1) * footerLineH;
  let fy = footerTopY;
  for (const line of footerLines) {
    const w = font.widthOfTextAtSize(line, footerSize);
    page.drawText(line, { x: (PAGE_W - w) / 2, y: fy, size: footerSize, font, color: GREY });
    fy -= footerLineH;
  }
}
