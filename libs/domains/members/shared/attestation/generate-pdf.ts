import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  CONTENT_W,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawImageAtHeight,
  drawLetterhead,
  drawParagraph,
  loadLetterhead,
  type LetterheadSpec
} from '@nba/pdf';
import type { AttestationConfig } from './config';
import { signatureKind } from './config';
import { cotisationSentence, formatFrenchDate, formatSeason, seasonIssueDate } from './format';

// Données dynamiques issues de la fiche adhérent (cf. get-member-cse-data).
export type AttestationData = {
  lastName: string;
  firstName: string;
  birthDate: string;
  amount: number; // centimes
  amountReceived: number; // centimes, réglés à ce jour
  paymentMethod: string;
  paymentDate: string; // ISO `YYYY-MM-DD`, ou '' si Poona ne l'a pas exportée
  season: string;
};

export async function generateCseAttestationPdf(
  data: AttestationData,
  config: AttestationConfig,
  spec: LetterheadSpec,
  city: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Attestation d'adhésion – ${data.firstName} ${data.lastName}`);
  doc.setCreator(spec.clubName);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  /*
   * La signature configurée peut être un PNG ou un JPEG : on choisit l'intégration
   * d'après ses octets. `embedJpg` sur un PNG ne dégrade pas l'image, il lève — la
   * génération entière échouait donc, pour un format que rien n'obligeait à refuser.
   *
   * Sans signature configurée, l'attestation sort sans image : plus aucune signature
   * n'est empaquetée avec l'application, ce serait celle d'un autre club.
   */
  const configured = config.signatureBase64;
  const signature = configured
    ? await (signatureKind(configured) === 'png' ? doc.embedPng(configured) : doc.embedJpg(configured))
    : null;

  // ---------- PAPIER À LETTRE (club, partagé) ----------
  const letterhead = await loadLetterhead(doc, spec);
  drawLetterhead(page, letterhead, font, bold);
  const BRAND = letterhead.brand;
  const stamp = letterhead.stamp;

  // ---------- TITRES ----------
  const titleY = letterhead.bodyTop - 30;
  const title = "ATTESTATION D'ADHÉSION";
  page.drawText(title, { x: (PAGE_W - bold.widthOfTextAtSize(title, 20)) / 2, y: titleY, size: 20, font: bold, color: INK });
  const subtitle = 'Facture acquittée';
  page.drawText(subtitle, { x: (PAGE_W - font.widthOfTextAtSize(subtitle, 14)) / 2, y: titleY - 22, size: 14, font, color: GREY });
  // Filet aux couleurs du papier à lettre, sous le titre.
  page.drawLine({
    start: { x: (PAGE_W - 120) / 2, y: titleY - 38 },
    end: { x: (PAGE_W + 120) / 2, y: titleY - 38 },
    thickness: 2,
    color: BRAND
  });

  // ---------- CORPS ----------
  const bodySize = 11;
  const lineH = 18;
  let y = titleY - 72;

  y = drawParagraph(
    page,
    `Je soussigné, ${config.signatoryName}, représentant ${spec.clubName.toUpperCase()}, association sportive affiliée à la FFBaD (Fédération Française de Badminton), certifie que :`,
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

  y = drawParagraph(page, cotisationSentence(data), {
    x: MARGIN,
    y,
    maxWidth: CONTENT_W,
    font,
    size: bodySize,
    lineHeight: lineH
  });

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

  // Colonne gauche : « Ville, le … » + tampon, centrés dans la colonne.
  const dateLine = `${city || spec.clubName}, le ${dateStr}`;
  const dateW = font.widthOfTextAtSize(dateLine, 11);
  page.drawText(dateLine, { x: leftColLeft + (leftColW - dateW) / 2, y: sigTop, size: 11, font, color: INK });
  if (stamp) {
    const stampH = 52;
    const stampW = (stamp.width / stamp.height) * stampH;
    page.drawImage(stamp, { x: leftColLeft + (leftColW - stampW) / 2, y: sigTop - 14 - stampH, width: stampW, height: stampH });
  }

  // Colonne droite : Signature → image → Mail → Site web.
  page.drawText('Signature', { x: rightX, y: sigTop, size: 11, font: bold, color: INK });
  if (signature) drawImageAtHeight(page, signature, rightX, sigTop - 16, 58);
  let ry = sigTop - 16 - 58 - 14;
  page.drawText(`Mail : ${config.signatoryEmail}`, { x: rightX, y: ry, size: 9, font, color: GREY });
  ry -= 13;
  page.drawText(`Site web : ${config.websiteUrl}`, { x: rightX, y: ry, size: 9, font, color: GREY });

  return doc.save();
}
