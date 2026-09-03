import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { generateSeasonReportPdf } from './generate-report-pdf';
import type { AccountClass, DbCategory } from './ui/report-types';

/*
 * Pagination du compte de résultat.
 *
 * Le rapport se dessine à l'interligne le plus aéré qui laisse chaque bloc entier sur sa
 * page : tout sur une page quand c'est possible, sinon les charges entières sur la première
 * et les produits entiers sur la suivante. Ces tests fixent ce contrat par le nombre de pages
 * et par ce que chaque page contient.
 */

const CLASSES: AccountClass[] = [
  { id: 4, code: '60', label: 'Achats', type: 'depense' },
  { id: 6, code: '62', label: 'Autres services extérieurs', type: 'depense' },
  { id: 8, code: '64', label: 'Charges de personnel', type: 'depense' },
  { id: 9, code: '65', label: 'Autres charges de gestion courante', type: 'depense' },
  { id: 10, code: '67', label: 'Charges exceptionnelles', type: 'depense' },
  { id: 1, code: '70', label: 'Ventes de produits et prestations', type: 'recette' },
  { id: 2, code: '74', label: 'Subventions', type: 'recette' },
  { id: 3, code: '75', label: 'Autres produits de gestion courante', type: 'recette' }
];

/** Un compte de résultat à `nbCharges` catégories de charges et `nbProduits` de produits, toutes mouvementées. */
function scenario(nbCharges: number, nbProduits: number) {
  const depenses = CLASSES.filter((c) => c.type === 'depense');
  const recettes = CLASSES.filter((c) => c.type === 'recette');
  const categories: DbCategory[] = [];
  const totaux: Record<string, { type: 'recette' | 'depense'; total: number }> = {};
  let id = 1;
  for (let i = 0; i < nbCharges; i++, id++) {
    categories.push({ id, adminLabel: `Charge ${id}`, adherentLabel: '', hideInExpenses: false, expenseAccountClassId: depenses[i % depenses.length].id });
    totaux[`${id}_depense`] = { type: 'depense', total: 100_00 * (i + 1) };
  }
  for (let i = 0; i < nbProduits; i++, id++) {
    categories.push({ id, adminLabel: `Produit ${id}`, adherentLabel: '', hideInExpenses: false, receiptAccountClassId: recettes[i % recettes.length].id });
    totaux[`${id}_recette`] = { type: 'recette', total: 120_00 * (i + 1) };
  }
  const totalDepenses = Object.values(totaux).filter((t) => t.type === 'depense').reduce((s, t) => s + t.total, 0);
  const totalRecettes = Object.values(totaux).filter((t) => t.type === 'recette').reduce((s, t) => s + t.total, 0);
  const report = {
    season: { id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', closedAt: null },
    compteResultat: { totalRecettes, totalDepenses, netResult: totalRecettes - totalDepenses, categories: totaux },
    bilanTrésorerie: []
  } as any;
  return { report, categories };
}

/** Flux de contenu pdf-lib : compressé en Flate, texte en chaînes hexadécimales `<…> Tj`. */
async function gonfler(octets: Uint8Array): Promise<string> {
  const flux = new Blob([Buffer.from(octets)]).stream().pipeThrough(new DecompressionStream('deflate'));
  return Buffer.from(await new Response(flux).arrayBuffer()).toString('latin1');
}

/** Le texte dessiné sur chaque page, dans l'ordre du dessin. */
async function textesParPage(pdf: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  const pages = doc.getPages();
  const textes: string[] = [];
  for (const page of pages) {
    const contents = page.node.get(PDFName.of('Contents'));
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    let brut = '';
    for (const ref of refs) {
      const flux = doc.context.lookup(ref);
      if (!(flux instanceof PDFRawStream)) continue;
      const filtre = flux.dict.get(PDFName.of('Filter'));
      brut += filtre === PDFName.of('FlateDecode') ? await gonfler(flux.contents) : Buffer.from(flux.contents).toString('latin1');
    }
    textes.push(
      (brut.match(/<([0-9a-fA-F]+)>\s*Tj/g) ?? [])
        .map((m) => Buffer.from(m.replace(/[<>]|\s*Tj/g, ''), 'hex').toString('latin1'))
        .join(' ')
    );
  }
  return textes;
}

describe('generateSeasonReportPdf — compte de résultat', () => {
  it("tient sur une seule page dès qu'un interligne plus serré le permet", async () => {
    // À l'interligne aéré ce rapport déborde ; resserré, il tient. Une page, donc.
    const { report, categories } = scenario(6, 4);
    const textes = await textesParPage(await generateSeasonReportPdf('income-statement', report, categories, CLASSES));
    expect(textes).toHaveLength(1);
    expect(textes[0]).toContain('CHARGES');
    expect(textes[0]).toContain('PRODUITS');
  });

  it('garde les charges entières, total compris, sur la première page', async () => {
    // Le cas vécu : un exercice fourni dont la barre « TOTAL GÉNÉRAL » des charges
    // basculait seule en tête de la deuxième page.
    const { report, categories } = scenario(18, 16);
    const textes = await textesParPage(await generateSeasonReportPdf('income-statement', report, categories, CLASSES));
    expect(textes).toHaveLength(2);
    expect(textes[0]).toContain('CHARGES');
    expect(textes[0]).toContain('TOTAL G');
    expect(textes[0]).not.toContain('PRODUITS');
    expect(textes[1]).toContain('PRODUITS');
    expect(textes[1]).toContain('TOTAL G');
  });

  it('pagine sans se bloquer un rapport trop long pour tenir en deux pages', async () => {
    const { report, categories } = scenario(60, 60);
    const textes = await textesParPage(await generateSeasonReportPdf('income-statement', report, categories, CLASSES));
    expect(textes.length).toBeGreaterThanOrEqual(3);
    expect(textes.at(-1)).toContain('TOTAL G');
  });
});
