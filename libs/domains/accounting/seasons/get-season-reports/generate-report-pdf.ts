import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  CONTENT_W,
  GREY,
  INK,
  MARGIN,
  PAGE_H,
  PAGE_W,
  drawClubFooter,
  drawClubHeader,
  formatFrenchDate
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
import { accountLabels } from './ui/report-utils';

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
  // Espace réservé en bas pour la ligne « Nos Partenaires : … » (pied de page club).
  const bottomLimit = MARGIN + 44;

  // --- gestion de page + curseur vertical partagé ---
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = 0;
  drawClubFooter(page, { font });
  const ruleY = await drawClubHeader(doc, page, { font, bold });

  // Titre du rapport, sous l'en-tête club.
  y = ruleY - 34;
  page.drawText(title, { x: MARGIN, y, size: 17, font: bold, color: INK });
  y -= 18;
  // Le nom de saison peut déjà contenir « Saison … » → éviter le doublon.
  const seasonText = /^saison\b/i.test(seasonLabel) ? seasonLabel : `Saison ${seasonLabel}`;
  const sub = `${seasonText}${reportRaw.arretedAu ? ` — arrêté au ${formatFrenchDate(reportRaw.arretedAu)}` : ''}`;
  page.drawText(sub, { x: MARGIN, y, size: 10, font, color: GREY });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.8, color: GREY });
  y -= 24;

  function addBlankPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawClubFooter(page, { font });
    y = PAGE_H - MARGIN;
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

    const drawSide = (classes: AccountClass[], side: 'depense' | 'recette') => {
      for (const ac of classes) {
        const classReal = calcGetClassSumRealise(categories, report, null, ac.code, side, 'realise', accountClasses);
        const cPrev = classPrev(ac.code, side);
        if (classReal <= 0 && cPrev <= 0) continue;

        ensureSpace(19);
        page.drawText(clip(classLabel(ac), bold, 10, labelMax), { x: MARGIN, y, size: 10, font: bold, color: INK });
        drawRight(formatEuros(classReal), colReal, 10, bold, INK);
        drawRight(formatEuros(cPrev), colPrev, 10, bold, INK);
        drawRight(formatDelta(classReal - cPrev), colEcart, 10, bold, ecartColor(classReal - cPrev, side));
        y -= 6;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.4, color: GREY });
        y -= 13;

        for (const cat of calcGetClassCategories(categories, ac.code, side, accountClasses)) {
          const tReal = calcGetCatTotal(report, null, String(cat.id), side, 'realise');
          const tPrev = catPrev(cat.id, side);
          if (tReal <= 0 && tPrev <= 0) continue;
          ensureSpace(13);
          page.drawText(`•  ${clip(cat.adminLabel, font, 9.5, labelMax - 14)}`, { x: MARGIN + 14, y, size: 9.5, font, color: GREY });
          drawRight(formatEuros(tReal), colReal, 9.5, font, GREY);
          drawRight(formatEuros(tPrev), colPrev, 9.5, font, GREY);
          drawRight(formatDelta(tReal - tPrev), colEcart, 9.5, font, ecartColor(tReal - tPrev, side));
          y -= 13;
        }
        y -= 6;
      }
    };

    // Hauteur estimée d'une section (mêmes prédicats de visibilité que drawSide),
    // pour décider d'un saut de page propre avant les Produits.
    const measureSide = (classes: AccountClass[], side: 'depense' | 'recette') => {
      let h = 0;
      for (const ac of classes) {
        const classReal = calcGetClassSumRealise(categories, report, null, ac.code, side, 'realise', accountClasses);
        const cPrev = classPrev(ac.code, side);
        if (classReal <= 0 && cPrev <= 0) continue;
        h += 19;
        for (const cat of calcGetClassCategories(categories, ac.code, side, accountClasses)) {
          const tReal = calcGetCatTotal(report, null, String(cat.id), side, 'realise');
          if (tReal > 0 || catPrev(cat.id, side) > 0) h += 13;
        }
        h += 6;
      }
      return h;
    };

    // --- Charges ---
    sectionBar('CHARGES (Dépenses)', RED);
    colHeaders();
    drawSide(charges, 'depense');
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
    const produitsH =
      30 + 14 + measureSide(produits, 'recette') + (netResReal < 0 || netResPrev < 0 ? 16 : 0) + 31;
    if (y - produitsH < bottomLimit) addBlankPage();
    else y -= 12;

    sectionBar('PRODUITS (Recettes)', GREEN);
    colHeaders();
    drawSide(produits, 'recette');
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
      page.drawText(clip(accountLabels[item.accountId] || item.accountId, bold, 10, labelMax), { x: MARGIN, y, size: 10, font: bold, color: INK });
      drawRight(formatEuros(item.initialBalance), colInit, 9.5, font, INK);
      drawRight(formatDelta(mvt), colMvt, 9.5, font, mvt >= 0 ? GREEN : RED);
      drawRight(formatEuros(item.finalBalance), colFinal, 10, bold, INK);
      y -= 15;
    }

    const dispo = reportRaw.tresorerieDisponible;
    if (!dispo) return;

    y -= 12;
    ensureSpace(24);
    page.drawText('Trésorerie Disponible & Régularisations', { x: MARGIN, y, size: 12, font: bold, color: INK });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.6, color: GREY });
    y -= 18;

    const line = (label: string, amount: string, opts?: { indent?: boolean; strong?: boolean; color?: any }) => {
      ensureSpace(15);
      const f = opts?.strong ? bold : font;
      const color = opts?.color ?? (opts?.indent ? GREY : INK);
      page.drawText(clip(label, f, opts?.strong ? 10.5 : 10, CONTENT_W - 130), { x: MARGIN + (opts?.indent ? 14 : 0), y, size: opts?.strong ? 10.5 : 10, font: f, color });
      drawRight(amount, rightEdge, opts?.strong ? 10.5 : 10, f, color);
      y -= 15;
    };

    line('Trésorerie comptable (soldes totaux)', formatEuros(dispo.totalGrossCashCents), { strong: true });
    if (dispo.inVaultCents > 0) line('- dont chèques en coffre (non déposés)', `- ${formatEuros(dispo.inVaultCents)}`, { indent: true });
    if (dispo.pendingDebitCents > 0) line('- dont paiements en attente de débit (CB)', `+ ${formatEuros(dispo.pendingDebitCents)}`, { indent: true });
    y -= 6;
    ensureSpace(22);
    page.drawLine({ start: { x: MARGIN, y: y + 11 }, end: { x: rightEdge, y: y + 11 }, thickness: 0.5, color: GREY });
    line('Trésorerie disponible en banque (Relevés)', formatEuros(dispo.netAvailableCashCents), { strong: true });

    if (dispo.deferredRevenues.length > 0 || dispo.deferredExpenses.length > 0) {
      y -= 10;
      ensureSpace(18);
      page.drawText('Impacts sur le résultat (Régularisations)', { x: MARGIN, y, size: 10, font: bold, color: GREY });
      y -= 16;

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
