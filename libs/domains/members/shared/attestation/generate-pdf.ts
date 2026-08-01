import { PDFDocument, PDFFont, PDFImage, PDFPage, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import * as A from './assets';
import type { EmbeddedImage } from './assets';
import type { AttestationConfig } from './config';
import { formatFrenchDate, formatSeason, numberToFrenchWords, paymentMethodLabel } from './format';

// Données dynamiques issues de la fiche adhérent (cf. get-member-cse-data).
export type AttestationData = {
  lastName: string;
  firstName: string;
  birthDate: string;
  amount: number; // centimes
  paymentMethod: string;
  paymentDate: string; // ISO ou 'date de validation'
  season: string;
};

// --- géométrie (A4 portrait, origine en bas-gauche) ---
const [PAGE_W, PAGE_H] = PageSizes.A4;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.09, 0.11, 0.17);
const GREY = rgb(0.37, 0.37, 0.37);

const FOOTER_TEXT =
  "Nos Partenaires : Ville de Nozay – Conseil Départemental de l'Essonne – ANS du Ministère des Sports, de la Jeunesse, de l'Education Populaire et de la Vie Associative – Babolat – J2S – Lardesport – Société Générale";

const embed = (doc: PDFDocument, a: EmbeddedImage): Promise<PDFImage> =>
  a.kind === 'png' ? doc.embedPng(a.base64) : doc.embedJpg(a.base64);

/** Découpe un texte en lignes qui tiennent dans `maxWidth`. */
function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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
function drawParagraph(
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
function drawImageAtHeight(page: PDFPage, img: PDFImage, x: number, topY: number, targetH: number): { width: number } {
  const width = (img.width / img.height) * targetH;
  page.drawImage(img, { x, y: topY - targetH, width, height: targetH });
  return { width };
}

/** Ajuste une image DANS une cellule (contain) et la centre. */
function drawImageInCell(page: PDFPage, img: PDFImage, cellX: number, cellTopY: number, cellW: number, cellH: number): void {
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

export async function generateCseAttestationPdf(data: AttestationData, config: AttestationConfig): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Attestation d'adhésion – ${data.firstName} ${data.lastName}`);
  doc.setCreator('Nozay Badminton Association');
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const [clubLogo, stamp, efb, essonne, idf, nozay] = await Promise.all([
    embed(doc, A.clubLogo),
    embed(doc, A.stamp),
    embed(doc, A.logoEfb),
    embed(doc, A.logoEssonne),
    embed(doc, A.logoIdf),
    embed(doc, A.logoNozay)
  ]);
  const signature = await doc.embedJpg(config.signatureBase64 ?? A.defaultSignature.base64);

  // ---------- EN-TÊTE ----------
  const headerTop = PAGE_H - MARGIN;
  const logoH = 84;
  const logo = drawImageAtHeight(page, clubLogo, MARGIN, headerTop, logoH);

  // Bloc identité à droite du logo.
  const idX = MARGIN + logo.width + 16;
  // Titre : aligné avec le HAUT du logo.
  page.drawText('Nozay Badminton Association', { x: idX, y: headerTop - 12, size: 12.5, font: bold, color: INK });
  // Lignes d'info : bloc calé sur le BAS du logo.
  const idLines = [
    'Adresse : Mairie de Nozay, 91620 NOZAY',
    'Site web : www.nozaybad.fr',
    'Association N° 0913011863',
    'Agrément DDJS : 91 S 744',
    'Affiliation FFBaD : LIFB.91.96.018'
  ];
  const idStep = 10.5;
  let iy = headerTop - logoH + (idLines.length - 1) * idStep;
  for (const line of idLines) {
    page.drawText(line, { x: idX, y: iy, size: 8.5, font, color: GREY });
    iy -= idStep;
  }

  // Logos partenaires en grille 2×2, ancrée en haut à droite.
  // Rangée du haut (éFB, Essonne) plus haute → pousse Île-de-France plus bas ;
  // Île-de-France et le blason de Nozay partagent la même rangée (alignés).
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

  // Pas de trait de séparation entre l'en-tête et le corps (repère de position seul).
  const ruleY = headerTop - 92;

  // ---------- TITRES ----------
  // Plus d'espace en-tête ↔ corps → bloc mieux équilibré verticalement.
  const titleY = ruleY - 96;
  const title = "ATTESTATION D'ADHÉSION";
  page.drawText(title, { x: (PAGE_W - bold.widthOfTextAtSize(title, 20)) / 2, y: titleY, size: 20, font: bold, color: INK });
  const subtitle = 'Facture acquittée';
  page.drawText(subtitle, { x: (PAGE_W - font.widthOfTextAtSize(subtitle, 14)) / 2, y: titleY - 22, size: 14, font, color: GREY });

  // ---------- CORPS ----------
  const bodySize = 11;
  const lineH = 18;
  let y = titleY - 62;

  y = drawParagraph(
    page,
    `Je soussigné, ${config.signatoryName}, représentant NOZAY BADMINTON ASSOCIATION, association sportive affiliée à la FFBaD (Fédération Française de Badminton), certifie que :`,
    { x: MARGIN, y, maxWidth: CONTENT_W, font, size: bodySize, lineHeight: lineH }
  );

  // Infos adhérent — texte simple, sans cadre (fidèle au modèle d'origine).
  y -= 20;
  page.drawText('Nom :', { x: MARGIN, y, size: 10, font, color: GREY });
  page.drawText(data.lastName.toUpperCase(), { x: MARGIN + 34, y, size: 11, font: bold, color: INK });
  page.drawText('Prénom :', { x: MARGIN + CONTENT_W / 2, y, size: 10, font, color: GREY });
  page.drawText(data.firstName, { x: MARGIN + CONTENT_W / 2 + 52, y, size: 11, font: bold, color: INK });
  y -= 22;
  page.drawText('Né(e) le :', { x: MARGIN, y, size: 10, font, color: GREY });
  page.drawText(formatFrenchDate(data.birthDate), { x: MARGIN + 54, y, size: 11, font: bold, color: INK });
  y -= 26;

  const euros = Math.floor(data.amount / 100);
  y = drawParagraph(
    page,
    `est adhérent(e) à notre association pour la pratique du badminton. Sa cotisation pour la saison sportive ${formatSeason(data.season)} s'élève à ${euros}€ (${numberToFrenchWords(euros)} euros) et a été réglée par ${paymentMethodLabel(data.paymentMethod)}.`,
    { x: MARGIN, y, maxWidth: CONTENT_W, font, size: bodySize, lineHeight: lineH }
  );

  y -= 8;
  y = drawParagraph(page, "Fait à la demande de l'intéressé(e) pour faire valoir ce que de droit.", {
    x: MARGIN,
    y,
    maxWidth: CONTENT_W,
    font,
    size: bodySize,
    lineHeight: lineH
  });

  // ---------- SIGNATURE (2 colonnes) ----------
  const dateStr =
    data.paymentDate === 'date de validation' || !data.paymentDate
      ? formatFrenchDate(new Date().toISOString().split('T')[0])
      : formatFrenchDate(data.paymentDate);

  const sigTop = y - 34;
  const leftColLeft = MARGIN;
  const rightX = MARGIN + CONTENT_W * 0.55;
  const leftColW = rightX - leftColLeft;

  // Colonne gauche : « Nozay, le … » + tampon, centrés dans la colonne.
  const dateLine = `Nozay, le ${dateStr}`;
  const dateW = font.widthOfTextAtSize(dateLine, 11);
  page.drawText(dateLine, { x: leftColLeft + (leftColW - dateW) / 2, y: sigTop, size: 11, font, color: INK });
  const stampH = 52;
  const stampW = (stamp.width / stamp.height) * stampH;
  page.drawImage(stamp, { x: leftColLeft + (leftColW - stampW) / 2, y: sigTop - 14 - stampH, width: stampW, height: stampH });

  // Colonne droite : Signature → image → Mail → Site web.
  page.drawText('Signature', { x: rightX, y: sigTop, size: 11, font: bold, color: INK });
  drawImageAtHeight(page, signature, rightX, sigTop - 16, 58);
  let ry = sigTop - 16 - 58 - 14;
  page.drawText(`Mail : ${config.signatoryEmail}`, { x: rightX, y: ry, size: 9, font, color: GREY });
  ry -= 13;
  page.drawText(`Site web : ${config.websiteUrl}`, { x: rightX, y: ry, size: 9, font, color: GREY });

  // ---------- PIED DE PAGE ----------
  const footerSize = 9;
  const footerLines = wrapLines(FOOTER_TEXT, font, footerSize, CONTENT_W);
  const footerLineH = 12;
  const footerTopY = MARGIN + (footerLines.length - 1) * footerLineH;
  // Pas de trait de séparation avant le pied de page.
  let fy = footerTopY;
  for (const line of footerLines) {
    const w = font.widthOfTextAtSize(line, footerSize);
    page.drawText(line, { x: (PAGE_W - w) / 2, y: fy, size: footerSize, font, color: GREY });
    fy -= footerLineH;
  }

  return doc.save();
}
