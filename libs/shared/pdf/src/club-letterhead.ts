import { PDFDocument, PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import * as A from './assets';
import { CONTENT_W, GREY, MARGIN, PAGE_H, PAGE_W, embed } from './helpers';

/*
 * Papier à lettre du club — modèle 2026.
 *
 * Le graphiste a fourni le courrier comme une feuille pré-imprimée : une bande
 * d'en-tête à fond perdu, un bas de page « Merci pour leur soutien » et les logos
 * partenaires. On le reproduit tel quel, à l'identique sur chaque page : c'est ce
 * que donnerait l'impression d'un document sur le papier du club.
 *
 * Les mentions légales (adresse, Siret, agrément, affiliation) ne figurent pas sur
 * le modèle ; elles restent pourtant obligatoires sur une facture. Elles se logent
 * à droite des logos partenaires, dans le blanc que le modèle y laisse : le corps du
 * document n'en perd pas une ligne.
 */

/** Encombrement du papier à lettre : le corps d'un document tient entre ces deux ordonnées. */
export type Letterhead = {
  bodyTop: number;
  bodyBottom: number;
  header: PDFImage;
  footer: PDFImage;
  ville: PDFImage;
  larde: PDFImage;
};

/*
 * Encombrement de l'encre dans `letterheadFooter`, en fraction de l'image : l'actif
 * porte de larges marges vides. On cale l'encre — et non le bord de l'image — sur la
 * marge du document, sinon le trait du bas de page pend 27 pt à gauche du texte.
 */
const FOOTER_INK = { left: 87 / 1786, right: 1677 / 1786, top: 43 / 148, bottom: 117 / 148 };

/** Hauteur de la bande partenaires, et repères du bloc bas de page (en points, depuis le bas). */
const PARTNERS_BOTTOM = 24;
const VILLE_H = 38;
const LARDE_H = 26;
const PARTNERS_GAP = 22;
/** Le trait du bas de page court juste au-dessus des logos partenaires. */
const FOOTER_INK_BOTTOM = PARTNERS_BOTTOM + VILLE_H + 10;

const LEGAL_LINES = [
  'Nozay Badminton Association — Mairie de Nozay, 91620 NOZAY — Association n° 0913011863',
  'Siret 433 218 716 00010 — Agrément DDJS 91 S 744 — Affiliation FFBaD LIFB.91.96.018'
];
const LEGAL_SIZE = 6.5;

/**
 * Embarque les images du papier à lettre **une seule fois** pour le document, et en
 * déduit la zone utile. Un rapport de plusieurs pages redessine la même `PDFImage` :
 * la ré-embarquer à chaque page multiplierait le poids du PDF par le nombre de pages.
 */
export async function loadLetterhead(doc: PDFDocument): Promise<Letterhead> {
  const [header, footer, ville, larde] = await Promise.all([
    embed(doc, A.letterheadHeader),
    embed(doc, A.letterheadFooter),
    embed(doc, A.logoVilleNozay),
    embed(doc, A.logoLardeSports)
  ]);

  const headerH = PAGE_W * (header.height / header.width);
  const footerW = CONTENT_W / (FOOTER_INK.right - FOOTER_INK.left);
  const footerH = footerW * (footer.height / footer.width);
  const inkTop = FOOTER_INK_BOTTOM + footerH * (FOOTER_INK.bottom - FOOTER_INK.top);

  return {
    // La bande d'en-tête se termine par une pointe blanche : 20 pt d'air suffisent.
    bodyTop: PAGE_H - headerH - 20,
    bodyBottom: inkTop + 18,
    header,
    footer,
    ville,
    larde
  };
}

/** Dessine le papier à lettre sur une page : bande d'en-tête, bas de page, partenaires, mentions. */
export function drawLetterhead(page: PDFPage, lh: Letterhead, font: PDFFont): void {
  // --- Bande d'en-tête, à fond perdu sur toute la largeur. ---
  const headerH = PAGE_W * (lh.header.height / lh.header.width);
  page.drawImage(lh.header, { x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH });

  // --- Bas de page : encre calée sur les marges du document. ---
  const footerW = CONTENT_W / (FOOTER_INK.right - FOOTER_INK.left);
  const footerH = footerW * (lh.footer.height / lh.footer.width);
  page.drawImage(lh.footer, {
    x: MARGIN - FOOTER_INK.left * footerW,
    y: FOOTER_INK_BOTTOM - (1 - FOOTER_INK.bottom) * footerH,
    width: footerW,
    height: footerH
  });

  // --- Logos partenaires, alignés sur la marge gauche et centrés entre eux. ---
  const villeW = VILLE_H * (lh.ville.width / lh.ville.height);
  const lardeW = LARDE_H * (lh.larde.width / lh.larde.height);
  const bandCenter = PARTNERS_BOTTOM + VILLE_H / 2;
  page.drawImage(lh.ville, { x: MARGIN, y: PARTNERS_BOTTOM, width: villeW, height: VILLE_H });
  const lardeX = MARGIN + villeW + PARTNERS_GAP;
  page.drawImage(lh.larde, { x: lardeX, y: bandCenter - LARDE_H / 2, width: lardeW, height: LARDE_H });

  // --- Mentions légales, alignées à droite dans le blanc laissé par les logos. ---
  let ly = bandCenter + 4;
  for (const line of LEGAL_LINES) {
    const w = font.widthOfTextAtSize(line, LEGAL_SIZE);
    page.drawText(line, { x: PAGE_W - MARGIN - w, y: ly, size: LEGAL_SIZE, font, color: GREY });
    ly -= 9;
  }
}
