import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  BRAND,
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
import type { GetSeasonReportsOutput } from './dto';
import type { AccountClass, DbCategory, ReportData } from './ui/report-types';
import {
  getCatTotal as calcGetCatTotal,
  getClassCategories as calcGetClassCategories,
  getClassSumRealise as calcGetClassSumRealise,
  getTotalDepensesRealise as calcGetTotalDepenses,
  getTotalRecettesRealise as calcGetTotalRecettes,
  UNCLASSIFIED_CLASS_CODE,
  UNCLASSIFIED_CLASS_LABEL
} from './ui/report-calculations';
import { defaultChargeClasses, defaultProduitClasses } from './ui/report-constants';

export type ReportPdfType = 'income-statement' | 'analytics' | 'cash-flow';

const REPORT_TITLES: Record<ReportPdfType, string> = {
  'income-statement': 'Compte de Résultat',
  analytics: 'Suivi Analytique',
  'cash-flow': 'Bilan de Trésorerie'
};

// Palette alignée sur l'impression écran (charges rouge, produits vert).
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.725, 0.11, 0.11); // #b91c1c
const DARK_RED = rgb(0.498, 0.114, 0.114); // #7f1d1d
const GREEN = rgb(0.082, 0.502, 0.239); // #15803d
const DARK_GREEN = rgb(0.078, 0.325, 0.176); // #14532d

/** Centimes → « 1 234,56 € » (groupage manuel, sans dépendre d'Intl côté Worker). */
function formatEuros(cents: number): string {
  const neg = cents < 0;
  const [int, dec] = (Math.abs(cents) / 100).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}${grouped},${dec} €`;
}

/** Variation signée : « +… » / « -… ». */
function formatDelta(cents: number): string {
  return (cents >= 0 ? '+' : '') + formatEuros(cents);
}

/** Tronque un texte pour tenir dans `maxWidth` (ajoute « … »). */
function clip(text: string, font: any, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

export type BudgetRow = { categoryId: number; type: 'recette' | 'depense'; amountCents: number };

export async function generateSeasonReportPdf(
  type: ReportPdfType,
  reportRaw: GetSeasonReportsOutput,
  categories: DbCategory[],
  accountClasses: AccountClass[],
  budget: BudgetRow[] = []
): Promise<Uint8Array> {
  const report = reportRaw as unknown as ReportData;
  const title = REPORT_TITLES[type];
  const seasonLabel = reportRaw.season?.name || reportRaw.season?.code || '';

  const doc = await PDFDocument.create();
  doc.setTitle(`${title} — ${seasonLabel}`);
  doc.setCreator('Nozay Badminton Association');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const rightEdge = PAGE_W - MARGIN;

  // --- papier à lettre (club, partagé), embarqué une fois pour tout le document ---
  const letterhead = await loadLetterhead(doc);
  // Le corps s'arrête au-dessus du bas de page pré-imprimé.
  const bottomLimit = letterhead.bodyBottom;

  // --- gestion de page + curseur vertical partagé ---
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = 0;
  drawLetterhead(page, letterhead, font);

  // Titre du rapport, sous la bande d'en-tête.
  y = letterhead.bodyTop - 20;
  page.drawText(title, { x: MARGIN, y, size: 17, font: bold, color: INK });
  y -= 18;
  // Le nom de saison peut déjà contenir « Saison … » → éviter le doublon.
  const seasonText = /^saison\b/i.test(seasonLabel) ? seasonLabel : `Saison ${seasonLabel}`;
  const sub = `${seasonText}${reportRaw.arretedAu ? ` — arrêté au ${formatFrenchDate(reportRaw.arretedAu)}` : ''}`;
  page.drawText(sub, { x: MARGIN, y, size: 10, font, color: GREY });
  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 2, color: BRAND });
  y -= 24;

  /*
   * Chaque page reçoit le papier à lettre entier, comme une feuille pré-imprimée :
   * un rapport long tient sur plusieurs feuilles, toutes à l'en-tête du club.
   */
  function addBlankPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawLetterhead(page, letterhead, font);
    y = letterhead.bodyTop - 20;
  }
  function ensureSpace(needed: number) {
    if (y - needed < bottomLimit) addBlankPage();
  }
  function drawRight(text: string, x: number, size: number, f: any = font, color: any = INK) {
    page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f, color });
  }

  // Barre de section pleine couleur (texte blanc).
  function sectionBar(label: string, bg: any) {
    ensureSpace(30);
    const h = 20;
    page.drawRectangle({ x: MARGIN, y: y - h + 5, width: CONTENT_W, height: h, color: bg });
    page.drawText(label, { x: MARGIN + 8, y: y - h + 11, size: 11, font: bold, color: WHITE });
    y -= h + 10;
  }

  if (type === 'income-statement') {
    renderIncomeStatement();
  } else if (type === 'analytics') {
    renderAnalytics();
  } else {
    renderCashFlow();
  }

  return doc.save();

  // ======================================================================
  // COMPTE DE RÉSULTAT — charges puis produits, sous-totaux par classe et
  // lignes par catégorie, avec DEUX colonnes chiffrées (Réalisé + Prévisionnel).
  // Le prévisionnel provient du budget (centimes), calculé localement.
  // ======================================================================
  function renderIncomeStatement() {
    // Trois colonnes chiffrées, alignées à droite (petit padding sur le bord) :
    // Réalisé · Prévisionnel · Écart (= Réalisé − Prévisionnel).
    const colEcart = rightEdge - 2;
    const colPrev = colEcart - 88;
    const colReal = colPrev - 88;
    // Le libellé s'arrête à gauche du montant Réalisé (on réserve ~70 pt).
    const labelMax = colReal - 70 - MARGIN;

    /*
     * Interligne et corps des lignes : choisis d'après la place, pas figés.
     *
     * Avec un interligne unique, le bloc des charges d'une saison bien remplie dépassait
     * la première page de quelques points : sa barre « TOTAL GÉNÉRAL » se retrouvait seule
     * en tête de la deuxième, et les produits dessous. On mesure donc chaque bloc avant de
     * dessiner, et on resserre juste ce qu'il faut — de la présentation aérée d'origine
     * (10 pt) jusqu'à 8 pt, seuil en deçà duquel le rapport ne se lit plus. Passé ce
     * seuil, la pagination reprend ses droits.
     */
    type Densite = {
      /** Corps du libellé de classe et de ses montants. */
      classeSize: number;
      /** Corps d'une ligne de catégorie. */
      ligneSize: number;
      /** Hauteur d'une ligne de classe (libellé, filet compris). */
      classe: number;
      /** Hauteur d'une ligne de catégorie. */
      ligne: number;
      /** Air laissé sous la dernière catégorie d'une classe. */
      apresClasse: number;
    };
    const DENSITES: Densite[] = [
      { classeSize: 10, ligneSize: 9.5, classe: 19, ligne: 13, apresClasse: 6 },
      { classeSize: 9.5, ligneSize: 9, classe: 17, ligne: 11.5, apresClasse: 4 },
      { classeSize: 9, ligneSize: 8.5, classe: 15, ligne: 10.5, apresClasse: 3 },
      { classeSize: 8.5, ligneSize: 8, classe: 14, ligne: 9.5, apresClasse: 2 }
    ];
    // Hauteurs fixes d'un bloc : barre de section, en-têtes de colonnes, résultat, total.
    const H_SECTION = 30;
    const H_ENTETES = 14;
    const H_RESULTAT = 16;
    const H_TOTAL = 31;
    /** Air entre le total des charges et la barre des produits, quand ils partagent la page. */
    const H_ENTRE_BLOCS = 12;

    const chargeClasses = accountClasses.filter((ac) => ac.type === 'depense');
    const produitClasses = accountClasses.filter((ac) => ac.type === 'recette');
    /*
     * La pseudo-classe « Non ventilé » ferme chaque colonne, comme à l'écran.
     *
     * Sans elle, une catégorie sans classe de compte de ce côté — ou une écriture sans catégorie —
     * comptait dans le total sans apparaître dans aucune rubrique : le PDF présentait un compte de
     * résultat dont les lignes ne faisaient pas la somme annoncée.
     */
    const unclassified = (type: 'recette' | 'depense') =>
      ({ code: UNCLASSIFIED_CLASS_CODE, label: UNCLASSIFIED_CLASS_LABEL, type }) as AccountClass;
    const charges = [...(chargeClasses.length ? chargeClasses : (defaultChargeClasses as AccountClass[])), unclassified('depense')];
    const produits = [...(produitClasses.length ? produitClasses : (defaultProduitClasses as AccountClass[])), unclassified('recette')];

    // --- Prévisionnel (budget) : montants en centimes, comme le réalisé. ---
    const budgetMap: Record<string, number> = {};
    for (const b of budget) budgetMap[`${b.categoryId}_${b.type}`] = b.amountCents;
    const catPrev = (catId: number, side: 'depense' | 'recette') => budgetMap[`${catId}_${side}`] ?? 0;
    const classPrev = (code: string, side: 'depense' | 'recette') =>
      calcGetClassCategories(categories, code, side, accountClasses).reduce((s, cat) => s + catPrev(cat.id, side), 0);
    const totalPrevOf = (classes: AccountClass[], side: 'depense' | 'recette') =>
      classes.reduce((s, ac) => s + classPrev(ac.code, side), 0);

    const totalDep = calcGetTotalDepenses(accountClasses, categories, report, null, 'realise');
    const totalRec = calcGetTotalRecettes(accountClasses, categories, report, null, 'realise');
    const netResReal = totalRec - totalDep;
    const totalDepPrev = totalPrevOf(charges, 'depense');
    const totalRecPrev = totalPrevOf(produits, 'recette');
    const netResPrev = totalRecPrev - totalDepPrev;

    const classLabel = (ac: AccountClass) => {
      const l = ac.label || '';
      // « Non ventilé » n'a pas de code du plan de comptes à préfixer.
      if (ac.code === UNCLASSIFIED_CLASS_CODE) return l;
      return l.startsWith(ac.code) ? l : `${ac.code} - ${l}`;
    };

    // En-têtes de colonnes sous une barre de section.
    const colHeaders = () => {
      ensureSpace(14);
      drawRight('Réalisé', colReal, 8, bold, GREY);
      drawRight('Prévisionnel', colPrev, 8, bold, GREY);
      drawRight('Écart', colEcart, 8, bold, GREY);
      y -= 14;
    };

    // Ligne « total général » : barre pleine couleur, Réalisé + Prévisionnel.
    // Pas d'écart ici : le total est équilibré par construction.
    const totalBar = (label: string, real: string, prev: string, bg: any) => {
      ensureSpace(31);
      const h = 19;
      page.drawRectangle({ x: MARGIN, y: y - h + 5, width: CONTENT_W, height: h, color: bg });
      page.drawText(label, { x: MARGIN + 8, y: y - h + 10, size: 10.5, font: bold, color: WHITE });
      page.drawText(real, { x: colReal - bold.widthOfTextAtSize(real, 10), y: y - h + 10, size: 10, font: bold, color: WHITE });
      page.drawText(prev, { x: colPrev - bold.widthOfTextAtSize(prev, 10), y: y - h + 10, size: 10, font: bold, color: WHITE });
      y -= h + 12;
    };

    // Couleur de l'écart : vert si favorable au budget, rouge sinon.
    // Recettes : réalisé > prévu = favorable. Charges : réalisé < prévu = favorable.
    const ecartColor = (diff: number, side: 'depense' | 'recette') => {
      if (diff === 0) return GREY;
      const favorable = side === 'recette' ? diff > 0 : diff < 0;
      return favorable ? GREEN : RED;
    };

    const drawSide = (classes: AccountClass[], side: 'depense' | 'recette', d: Densite) => {
      for (const ac of classes) {
        const classReal = calcGetClassSumRealise(categories, report, null, ac.code, side, 'realise', accountClasses);
        const cPrev = classPrev(ac.code, side);
        if (classReal <= 0 && cPrev <= 0) continue;

        ensureSpace(d.classe);
        page.drawText(clip(classLabel(ac), bold, d.classeSize, labelMax), { x: MARGIN, y, size: d.classeSize, font: bold, color: INK });
        drawRight(formatEuros(classReal), colReal, d.classeSize, bold, INK);
        drawRight(formatEuros(cPrev), colPrev, d.classeSize, bold, INK);
        drawRight(formatDelta(classReal - cPrev), colEcart, d.classeSize, bold, ecartColor(classReal - cPrev, side));
        // Le filet court sous les jambages, à mi-hauteur de l'air laissé avant les catégories.
        const filet = y - 6;
        page.drawLine({ start: { x: MARGIN, y: filet }, end: { x: rightEdge, y: filet }, thickness: 0.4, color: GREY });
        y -= d.classe;

        for (const cat of calcGetClassCategories(categories, ac.code, side, accountClasses)) {
          const tReal = calcGetCatTotal(report, null, String(cat.id), side, 'realise');
          const tPrev = catPrev(cat.id, side);
          if (tReal <= 0 && tPrev <= 0) continue;
          ensureSpace(d.ligne);
          page.drawText(`•  ${clip(cat.adminLabel, font, d.ligneSize, labelMax - 14)}`, { x: MARGIN + 14, y, size: d.ligneSize, font, color: GREY });
          drawRight(formatEuros(tReal), colReal, d.ligneSize, font, GREY);
          drawRight(formatEuros(tPrev), colPrev, d.ligneSize, font, GREY);
          drawRight(formatDelta(tReal - tPrev), colEcart, d.ligneSize, font, ecartColor(tReal - tPrev, side));
          y -= d.ligne;
        }
        y -= d.apresClasse;
      }
    };

    // Hauteur des lignes d'un côté (mêmes prédicats de visibilité que drawSide).
    const measureSide = (classes: AccountClass[], side: 'depense' | 'recette', d: Densite) => {
      let h = 0;
      for (const ac of classes) {
        const classReal = calcGetClassSumRealise(categories, report, null, ac.code, side, 'realise', accountClasses);
        const cPrev = classPrev(ac.code, side);
        if (classReal <= 0 && cPrev <= 0) continue;
        h += d.classe;
        for (const cat of calcGetClassCategories(categories, ac.code, side, accountClasses)) {
          const tReal = calcGetCatTotal(report, null, String(cat.id), side, 'realise');
          if (tReal > 0 || catPrev(cat.id, side) > 0) h += d.ligne;
        }
        h += d.apresClasse;
      }
      return h;
    };

    // Hauteur complète d'un bloc : barre, en-têtes, lignes, ligne de résultat, total.
    const hCharges = (d: Densite) =>
      H_SECTION + H_ENTETES + measureSide(charges, 'depense', d) + (netResReal >= 0 || netResPrev >= 0 ? H_RESULTAT : 0) + H_TOTAL;
    const hProduits = (d: Densite) =>
      H_SECTION + H_ENTETES + measureSide(produits, 'recette', d) + (netResReal < 0 || netResPrev < 0 ? H_RESULTAT : 0) + H_TOTAL;

    /*
     * Choix de la densité. Tout sur une page si une densité le permet ; sinon les charges
     * entières sur cette page et les produits entiers sur la suivante ; sinon la plus
     * serrée, et les sauts de page tombent où ils peuvent.
     */
    const placeIci = y - bottomLimit;
    const placePageVierge = letterhead.bodyTop - 20 - bottomLimit;
    const densite =
      DENSITES.find((d) => hCharges(d) + H_ENTRE_BLOCS + hProduits(d) <= placeIci) ??
      DENSITES.find((d) => hCharges(d) <= placeIci && hProduits(d) <= placePageVierge) ??
      DENSITES[DENSITES.length - 1];

    // --- Charges ---
    sectionBar('CHARGES (Dépenses)', RED);
    colHeaders();
    drawSide(charges, 'depense', densite);
    if (netResReal >= 0 || netResPrev >= 0) {
      ensureSpace(16);
      const excReal = netResReal >= 0 ? netResReal : 0;
      const excPrev = netResPrev >= 0 ? netResPrev : 0;
      page.drawText("Excédent de l'exercice (Bénéfice)", { x: MARGIN, y, size: 10, font: bold, color: GREEN });
      drawRight(formatEuros(excReal), colReal, 10, bold, GREEN);
      drawRight(formatEuros(excPrev), colPrev, 10, bold, GREEN);
      y -= 16;
    }
    const chargesReal = netResReal >= 0 ? totalDep + netResReal : totalDep;
    const chargesPrev = netResPrev >= 0 ? totalDepPrev + netResPrev : totalDepPrev;
    totalBar('TOTAL GÉNÉRAL', formatEuros(chargesReal), formatEuros(chargesPrev), DARK_RED);

    // --- Produits : démarrer sur une page propre s'il ne tient pas ici. ---
    if (y - hProduits(densite) < bottomLimit) addBlankPage();
    else y -= H_ENTRE_BLOCS;

    sectionBar('PRODUITS (Recettes)', GREEN);
    colHeaders();
    drawSide(produits, 'recette', densite);
    if (netResReal < 0 || netResPrev < 0) {
      ensureSpace(16);
      const defReal = netResReal < 0 ? -netResReal : 0;
      const defPrev = netResPrev < 0 ? -netResPrev : 0;
      page.drawText("Déficit de l'exercice (Perte)", { x: MARGIN, y, size: 10, font: bold, color: RED });
      drawRight(formatEuros(defReal), colReal, 10, bold, RED);
      drawRight(formatEuros(defPrev), colPrev, 10, bold, RED);
      y -= 16;
    }
    const produitsReal = netResReal < 0 ? totalRec + -netResReal : totalRec;
    const produitsPrev = netResPrev < 0 ? totalRecPrev + -netResPrev : totalRecPrev;
    totalBar('TOTAL GÉNÉRAL', formatEuros(produitsReal), formatEuros(produitsPrev), DARK_GREEN);
  }

  // ======================================================================
  // SUIVI ANALYTIQUE — recettes / dépenses / solde net par catégorie.
  // ======================================================================
  function renderAnalytics() {
    const colNet = rightEdge;
    const colDep = rightEdge - 95;
    const colRec = rightEdge - 200;
    const labelMax = colRec - 62 - MARGIN;

    const rows = categories
      .filter((c) => (c as any).active !== false)
      .map((c) => {
        const recettes = calcGetCatTotal(report, null, String(c.id), 'recette', 'realise');
        const depenses = calcGetCatTotal(report, null, String(c.id), 'depense', 'realise');
        return { label: c.adminLabel, recettes, depenses, net: recettes - depenses };
      })
      .filter((r) => r.recettes > 0 || r.depenses > 0)
      .sort((a, b) => b.net - a.net);

    // En-tête de tableau.
    page.drawText('Catégorie Analytique', { x: MARGIN, y, size: 9, font: bold, color: GREY });
    drawRight('Recettes', colRec, 9, bold, GREY);
    drawRight('Dépenses', colDep, 9, bold, GREY);
    drawRight('Solde Net', colNet, 9, bold, GREY);
    y -= 7;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.6, color: GREY });
    y -= 15;

    if (rows.length === 0) {
      page.drawText('Aucune donnée analytique pour cette saison.', { x: MARGIN, y, size: 10, font, color: GREY });
      return;
    }

    for (const r of rows) {
      ensureSpace(15);
      page.drawText(clip(r.label, font, 10, labelMax), { x: MARGIN, y, size: 10, font, color: INK });
      drawRight(r.recettes > 0 ? `+ ${formatEuros(r.recettes)}` : '—', colRec, 9.5, font, r.recettes > 0 ? GREEN : GREY);
      drawRight(r.depenses > 0 ? `- ${formatEuros(r.depenses)}` : '—', colDep, 9.5, font, r.depenses > 0 ? RED : GREY);
      drawRight(formatDelta(r.net), colNet, 9.5, bold, r.net > 0 ? GREEN : r.net < 0 ? RED : INK);
      y -= 15;
    }

    const totalRec = rows.reduce((s, r) => s + r.recettes, 0);
    const totalDep = rows.reduce((s, r) => s + r.depenses, 0);
    const totalNet = totalRec - totalDep;

    y -= 6;
    ensureSpace(24);
    page.drawLine({ start: { x: MARGIN, y: y + 12 }, end: { x: rightEdge, y: y + 12 }, thickness: 1, color: INK });
    page.drawText('TOTAL GLOBAL', { x: MARGIN, y, size: 10, font: bold, color: INK });
    drawRight(`+ ${formatEuros(totalRec)}`, colRec, 9.5, bold, GREEN);
    drawRight(`- ${formatEuros(totalDep)}`, colDep, 9.5, bold, RED);
    drawRight(formatDelta(totalNet), colNet, 10, bold, totalNet > 0 ? GREEN : totalNet < 0 ? RED : INK);
    y -= 16;
  }

  // ======================================================================
  // BILAN DE TRÉSORERIE — soldes des comptes + trésorerie disponible.
  // ======================================================================
  function renderCashFlow() {
    const colFinal = rightEdge;
    const colMvt = rightEdge - 105;
    const colInit = rightEdge - 210;
    const labelMax = colInit - 70 - MARGIN;

    // En-tête de tableau.
    page.drawText('Compte Financier', { x: MARGIN, y, size: 9, font: bold, color: GREY });
    drawRight('Solde Initial', colInit, 9, bold, GREY);
    drawRight('Mouvements', colMvt, 9, bold, GREY);
    drawRight('Solde Final', colFinal, 9, bold, GREY);
    y -= 7;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.6, color: GREY });
    y -= 15;

    for (const item of reportRaw.bilanTrésorerie) {
      const mvt = item.finalBalance - item.initialBalance;
      ensureSpace(15);
      page.drawText(clip(item.label || item.accountId, bold, 10, labelMax), { x: MARGIN, y, size: 10, font: bold, color: INK });
      drawRight(formatEuros(item.initialBalance), colInit, 9.5, font, INK);
      drawRight(formatDelta(mvt), colMvt, 9.5, font, mvt >= 0 ? GREEN : RED);
      drawRight(formatEuros(item.finalBalance), colFinal, 10, bold, INK);
      y -= 15;
    }

    const dispo = reportRaw.tresorerieDisponible;
    if (!dispo) return;

    /*
     * Le passage « comptable → disponible en banque » a été retiré, ici comme à l'écran.
     *
     * Il annonçait « Trésorerie disponible en banque (Relevés) » en affichant
     * `netAvailableCashCents`, c'est-à-dire le solde **théorique** — un nombre que le logiciel
     * calcule, jamais un relevé. Quand aucun chèque ne dormait en coffre, il concluait que « les
     * deux soldes coïncident » en comparant un nombre à lui-même. Le tableau ci-dessus porte
     * désormais les deux vraies colonnes (solde comptable, solde du relevé), et l'état de
     * rapprochement dit l'écart réel : ce bloc faisait doublon et mentait sur son intitulé.
     *
     * Les régularisations, elles, restent : elles ne se lisent nulle part ailleurs.
     */
    if (dispo.deferredRevenues.length === 0 && dispo.deferredExpenses.length === 0) return;

    y -= 12;
    ensureSpace(24);
    page.drawText('Régularisations Comptables', { x: MARGIN, y, size: 12, font: bold, color: INK });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.6, color: GREY });
    y -= 18;

    {
      if (dispo.deferredRevenues.length > 0) {
        ensureSpace(14);
        page.drawText("• Produits encaissés d'avance (à déduire du résultat) :", { x: MARGIN, y, size: 9.5, font, color: GREY });
        y -= 14;
        for (const d of dispo.deferredRevenues) {
          ensureSpace(13);
          const label = d.count > 1 ? `${d.categoryName} (${d.count} écritures)` : d.categoryName;
          page.drawText(clip(label, font, 9.5, CONTENT_W - 130), { x: MARGIN + 14, y, size: 9.5, font, color: GREY });
          drawRight(`- ${formatEuros(d.amountCents)}`, rightEdge, 9.5, font, GREY);
          y -= 13;
        }
      }
      if (dispo.deferredExpenses.length > 0) {
        y -= 4;
        ensureSpace(14);
        page.drawText("• Charges décaissées d'avance (à réintégrer au résultat) :", { x: MARGIN, y, size: 9.5, font, color: GREY });
        y -= 14;
        for (const d of dispo.deferredExpenses) {
          ensureSpace(13);
          const label = d.count > 1 ? `${d.categoryName} (${d.count} écritures)` : d.categoryName;
          page.drawText(clip(label, font, 9.5, CONTENT_W - 130), { x: MARGIN + 14, y, size: 9.5, font, color: GREY });
          drawRight(`+ ${formatEuros(d.amountCents)}`, rightEdge, 9.5, font, GREY);
          y -= 13;
        }
      }
    }
  }
}
