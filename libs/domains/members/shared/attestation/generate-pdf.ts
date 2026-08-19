import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  CONTENT_W,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  assets,
  drawClubFooter,
  drawClubHeader,
  drawImageAtHeight,
  drawParagraph,
  embed
} from '@nba/pdf';
import type { AttestationConfig } from './config';
import { formatFrenchDate, formatSeason, numberToFrenchWords, paymentMethodLabel, seasonIssueDate } from './format';

// Données dynamiques issues de la fiche adhérent (cf. get-member-cse-data).
export type AttestationData = {
  lastName: string;
  firstName: string;
  birthDate: string;
  amount: number; // centimes
  paymentMethod: string;
  paymentDate: string; // ISO `YYYY-MM-DD`, ou '' si Poona ne l'a pas exportée
  season: string;
};

export async function generateCseAttestationPdf(data: AttestationData, config: AttestationConfig): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Attestation d'adhésion – ${data.firstName} ${data.lastName}`);
  doc.setCreator('Nozay Badminton Association');
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const stamp = await embed(doc, assets.stamp);
  const signature = await doc.embedJpg(config.signatureBase64 ?? assets.defaultSignature.base64);

  // ---------- EN-TÊTE (club, partagé) ----------
  const ruleY = await drawClubHeader(doc, page, { font, bold });

  // ---------- TITRES ----------
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
  // Date d'émission : la date de règlement exportée par Poona quand elle existe, sinon
  // le 1er septembre de la saison couverte. Pas la date du jour : elle rendrait le PDF
  // non reproductible et incohérent avec la saison attestée.
  const issueDate = data.paymentDate || seasonIssueDate(data.season);
  const dateStr = formatFrenchDate(issueDate || new Date().toISOString().split('T')[0]);

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

  // ---------- PIED DE PAGE (club, partagé) ----------
  drawClubFooter(page, { font });

  return doc.save();
}
