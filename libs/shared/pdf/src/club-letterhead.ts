import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, type RGB } from 'pdf-lib';
import type { EmbeddedImage } from './assets';
import { CONTENT_W, GREY, INK, MARGIN, PAGE_H, PAGE_W, embed } from './helpers';

/*
 * Papier à lettre du club.
 *
 * Il était reproduit à l'identique depuis un modèle de graphiste, empaqueté dans le
 * worker — bande d'en-tête, bas de page « Merci pour leur soutien », logos partenaires,
 * mentions légales écrites en dur. Un autre club n'aurait eu ni ce modèle ni ces
 * mentions. Le papier se compose désormais d'après la configuration du club :
 *
 * - une bande d'en-tête **si le club en a déposé une** (à fond perdu, sur toute la
 *   largeur) ; sinon un en-tête composé — logo, nom, slogan, filet à la couleur de la
 *   marque ;
 * - un bas de page **optionnel** (image calée sur les marges), puis les logos
 *   partenaires à gauche et les mentions légales à droite, dans le blanc qu'ils laissent.
 *
 * Les mentions légales (adresse, RNA, Siret, agrément, affiliation) sont obligatoires
 * sur une facture : elles sont toujours écrites, même sans la moindre image.
 */

/** Ce que le club fournit au papier à lettre : ses images, ses lignes, sa couleur. */
export interface LetterheadSpec {
  clubName: string;
  tagline?: string;
  /** Lignes du bas de page, déjà composées (nom et adresse, puis identifiants). */
  legalLines: string[];
  /** Couleur de la marque, pour les titres et les filets des documents. */
  brand: RGB;
  header?: EmbeddedImage | null;
  footer?: EmbeddedImage | null;
  logo?: EmbeddedImage | null;
  stamp?: EmbeddedImage | null;
  partners?: EmbeddedImage[];
}

/** Encombrement du papier à lettre : le corps d'un document tient entre ces deux ordonnées. */
export type Letterhead = {
  bodyTop: number;
  bodyBottom: number;
  brand: RGB;
  clubName: string;
  tagline: string;
  legalLines: string[];
  header: PDFImage | null;
  footer: PDFImage | null;
  logo: PDFImage | null;
  stamp: PDFImage | null;
  partners: PDFImage[];
};

/** Hauteur de la bande partenaires, et repères du bloc bas de page (en points, depuis le bas). */
const PARTNERS_BOTTOM = 24;
const PARTNER_H = 36;
const PARTNERS_GAP = 18;
const LEGAL_SIZE = 6.5;
/** Hauteur de l'en-tête composé quand le club n'a pas de bande. */
const COMPOSED_HEADER_H = 64;
const COMPOSED_LOGO_H = 44;

/** `#23B8E9` → couleur pdf-lib ; une valeur illisible retombe sur un gris neutre. */
export function brandColor(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.35, 0.35, 0.35);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const embedOrNull = (doc: PDFDocument, a: EmbeddedImage | null | undefined) => (a ? embed(doc, a) : Promise.resolve(null));

/**
 * Embarque les images du papier à lettre **une seule fois** pour le document, et en
 * déduit la zone utile. Un rapport de plusieurs pages redessine la même `PDFImage` :
 * la ré-embarquer à chaque page multiplierait le poids du PDF par le nombre de pages.
 */
export async function loadLetterhead(doc: PDFDocument, spec: LetterheadSpec): Promise<Letterhead> {
  const [header, footer, logo, stamp, partners] = await Promise.all([
    embedOrNull(doc, spec.header),
    embedOrNull(doc, spec.footer),
    embedOrNull(doc, spec.logo),
    embedOrNull(doc, spec.stamp),
    Promise.all((spec.partners ?? []).map((p) => embed(doc, p)))
  ]);

  // La bande d'en-tête se termine souvent par une pointe : 20 pt d'air suffisent.
  const headerH = header ? PAGE_W * (header.height / header.width) : COMPOSED_HEADER_H;
  const footerH = footer ? CONTENT_W * (footer.height / footer.width) : 0;
  const partnersBandH = partners.length > 0 || spec.legalLines.length > 0 ? PARTNER_H : 0;
  const footerTop = PARTNERS_BOTTOM + partnersBandH + (footer ? 10 + footerH : 0);

  return {
    bodyTop: PAGE_H - headerH - 20,
    bodyBottom: footerTop + 18,
    brand: spec.brand,
    clubName: spec.clubName,
    tagline: spec.tagline ?? '',
    legalLines: spec.legalLines,
    header,
    footer,
    logo,
    stamp,
    partners
  };
}

/** Dessine le papier à lettre sur une page : en-tête, bas de page, partenaires, mentions. */
export function drawLetterhead(page: PDFPage, lh: Letterhead, font: PDFFont, bold: PDFFont = font): void {
  // --- En-tête : la bande du club à fond perdu, ou un en-tête composé. ---
  if (lh.header) {
    const headerH = PAGE_W * (lh.header.height / lh.header.width);
    page.drawImage(lh.header, { x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH });
  } else {
    const top = PAGE_H - MARGIN / 2;
    let x = MARGIN;
    if (lh.logo) {
      const logoW = COMPOSED_LOGO_H * (lh.logo.width / lh.logo.height);
      page.drawImage(lh.logo, { x, y: top - COMPOSED_LOGO_H, width: logoW, height: COMPOSED_LOGO_H });
      x += logoW + 12;
    }
    page.drawText(lh.clubName, { x, y: top - 18, size: 15, font: bold, color: INK });
    if (lh.tagline) page.drawText(lh.tagline, { x, y: top - 32, size: 9, font, color: GREY });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - COMPOSED_HEADER_H },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - COMPOSED_HEADER_H },
      thickness: 1.5,
      color: lh.brand
    });
  }

  // --- Bas de page : l'image du club, calée sur les marges, au-dessus des partenaires. ---
  const partnersBandH = lh.partners.length > 0 || lh.legalLines.length > 0 ? PARTNER_H : 0;
  if (lh.footer) {
    const footerH = CONTENT_W * (lh.footer.height / lh.footer.width);
    page.drawImage(lh.footer, { x: MARGIN, y: PARTNERS_BOTTOM + partnersBandH + 10, width: CONTENT_W, height: footerH });
  }

  // --- Logos partenaires, alignés sur la marge gauche et centrés entre eux. ---
  const bandCenter = PARTNERS_BOTTOM + PARTNER_H / 2;
  let px = MARGIN;
  for (const partner of lh.partners) {
    const w = PARTNER_H * (partner.width / partner.height);
    page.drawImage(partner, { x: px, y: PARTNERS_BOTTOM, width: w, height: PARTNER_H });
    px += w + PARTNERS_GAP;
  }

  // --- Mentions légales, alignées à droite dans le blanc laissé par les logos. ---
  let ly = bandCenter + 4;
  for (const line of lh.legalLines) {
    const w = font.widthOfTextAtSize(line, LEGAL_SIZE);
    page.drawText(line, { x: PAGE_W - MARGIN - w, y: ly, size: LEGAL_SIZE, font, color: GREY });
    ly -= 9;
  }
}

/** Un papier à lettre sans image ni mention : ce que reçoit un test, ou un club tout neuf. */
export function bareLetterhead(clubName = 'Club', brand: RGB = rgb(0.35, 0.35, 0.35)): LetterheadSpec {
  return { clubName, legalLines: [], brand };
}
