import type { DbCategory, AccountClass, ReportData } from './report-types';

/**
 * La pseudo-classe qui recueille ce qu'aucune classe de compte ne réclame.
 *
 * Le compte de résultat ne somme pas les catégories : il somme les **classes de compte**, en
 * repassant par les catégories rattachées à chacune. Toute catégorie dont la classe est nulle du
 * côté considéré n'appartenait donc à aucune colonne, et son montant disparaissait purement et
 * simplement du total — sans ligne, sans avertissement. Le bilan analytique, lui, énumère les
 * catégories et les comptait : d'où deux « résultats de l'exercice » qui ne tombaient pas juste.
 *
 * Le seed produit sept catégories exposées, chacune n'ayant de classe que d'un seul côté :
 * « Adhésions & Inscriptions », « Sponsoring », « Subventions » et « Intérêts Livret A » n'en ont
 * pas en charge (un remboursement de cotisation s'évaporait) ; « Salaires et Charges »,
 * « Licences FFBaD » et « Championnats » n'en ont pas en produit (une licence refacturée, une
 * aide à l'emploi s'évaporaient de même).
 *
 * Plutôt que d'omettre, on montre. Un total qui ne boucle pas doit le dire.
 */
export const UNCLASSIFIED_CLASS_CODE = '__non_ventile__';

/** La classe factice à ajouter en fin de colonne pour rendre visible ce résidu. */
export const UNCLASSIFIED_CLASS_LABEL = 'Non ventilé';

/**
 * La clé sous laquelle le serveur range les écritures **sans catégorie du tout**.
 *
 * `get-season-reports/handler.ts` les compte dans `totalRecettes`/`totalDepenses` sous
 * `divers_<type>`, mais ni le compte de résultat (qui itère les classes) ni le bilan analytique
 * (qui itère les catégories) ne lisaient cette clé : elles ne s'affichaient nulle part.
 */
const UNCATEGORIZED_KEY = 'divers';

/**
 * Renvoie la liste des catégories comptables rattachées à une classe de compte donnée (ex: '70', '60').
 * La correspondance s'effectue strictement par clé étrangère / ID de classe comptable (FK).
 */
export function getClassCategories(
  categories: DbCategory[],
  classCode: string,
  type: 'recette' | 'depense',
  accountClasses?: AccountClass[],
  report?: ReportData | null
): DbCategory[] {
  if (classCode === UNCLASSIFIED_CLASS_CODE) {
    return getUnclassifiedCategories(categories, type, accountClasses, report);
  }

  const targetClass = accountClasses?.find(ac => ac.code === classCode || String((ac as any).id) === classCode);
  const targetClassId = targetClass ? (targetClass as any).id : null;

  return categories.filter(cat => {
    const fkVal = type === 'recette'
      ? (cat.receiptCode || (cat as any).receiptAccountClassId)
      : (cat.expenseCode || (cat as any).expenseAccountClassId);

    if (fkVal === undefined || fkVal === null) return false;

    const fkStr = String(fkVal);

    if (fkStr === classCode) return true;

    if (targetClassId !== null && targetClassId !== undefined) {
      if (fkVal === targetClassId || fkStr === String(targetClassId)) return true;
    }

    return false;
  });
}

/**
 * Les catégories qu'aucune classe de compte du sens demandé ne réclame.
 *
 * Deux façons d'y tomber : la catégorie n'a pas de clé de classe de ce côté (le cas du seed), ou
 * elle en a une qui ne désigne aucune classe du bon type — une classe de trésorerie (512, 517,
 * 530) rattachée par erreur, par exemple, que ni la boucle des charges ni celle des produits ne
 * parcourt.
 */
export function getUnclassifiedCategories(
  categories: DbCategory[],
  type: 'recette' | 'depense',
  accountClasses?: AccountClass[],
  report?: ReportData | null
): DbCategory[] {
  const classesOfType = (accountClasses ?? []).filter(ac => ac.type === type);

  const claimed = new Set<string>();
  for (const ac of classesOfType) {
    for (const cat of getClassCategories(categories, ac.code, type, accountClasses)) {
      claimed.add(String(cat.id));
    }
  }

  return categories.filter(cat => {
    if (claimed.has(String(cat.id))) return false;

    /*
     * Une catégorie désactivée n'est retenue que si elle porte encore un montant.
     *
     * Sans cette nuance, l'écran de budget offrirait un champ de saisie pour des catégories
     * mortes — « Virements Internes » la première, désactivée par la migration `0023` — et un
     * montant saisi par mégarde gonflerait le total prévisionnel. Mais l'écarter purement et
     * simplement rejouerait le défaut qu'on corrige : une catégorie désactivée qui porte encore
     * les écritures d'un exercice passé doit rester visible, sans quoi son montant disparaîtrait
     * de nouveau du total. C'est aussi la divergence qui restait entre les deux écrans — le bilan
     * analytique écarte les inactives, le compte de résultat les gardait.
     */
    if ((cat as any).active === false) {
      // `getCatTotal` rend 0 sans rapport : hors du réalisé, une catégorie morte reste écartée.
      return getCatTotal(report as ReportData, null, cat.id.toString(), type, 'realise') !== 0;
    }
    return true;
  });
}

/**
 * Récupère le montant total réalisé pour une catégorie et un type d'écriture (recette/dépense) de la saison courante.
 * La clé dans report.compteResultat.categories est "${categoryId}_${type}".
 */
export function getCatTotal(
  report: ReportData,
  prevReport: ReportData | null,
  id: string,
  type: 'recette' | 'depense',
  mode: 'realise' | 'previsionnel'
): number {
  if (!report || !report.compteResultat || !report.compteResultat.categories) return 0;
  return report.compteResultat.categories[`${id}_${type}`]?.total || 0;
}

/**
 * Calcule la somme totale réalisée des catégories appartenant à une classe de compte pour la saison courante.
 */
export function getClassSumRealise(
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  classCode: string,
  type: 'recette' | 'depense',
  mode: 'realise' | 'previsionnel',
  accountClasses?: AccountClass[]
): number {
  const classCats = getClassCategories(categories, classCode, type, accountClasses, report);
  let sum = 0;
  for (const cat of classCats) {
    sum += getCatTotal(report, prevReport, cat.id.toString(), type, mode);
  }
  /*
   * Les écritures sans catégorie rejoignent le résidu : elles pesaient sur les totaux du serveur
   * sans être affichées nulle part, ce qui creusait un troisième écart, invisible.
   */
  if (classCode === UNCLASSIFIED_CLASS_CODE) {
    sum += getCatTotal(report, prevReport, UNCATEGORIZED_KEY, type, mode);
  }
  return sum;
}

/**
 * Calcule la somme totale prévisionnelle (budget) des catégories appartenant à une classe de compte.
 */
export function getClassSumPrevisionnel(
  categories: DbCategory[],
  editableBudget: Record<string, number>,
  classCode: string,
  type: 'recette' | 'depense',
  accountClasses?: AccountClass[]
): number {
  const classCats = getClassCategories(categories, classCode, type, accountClasses);
  return classCats.reduce((sum, cat) => sum + (editableBudget[`${cat.id}_${type}`] || 0), 0);
}

/**
 * Somme globale des dépenses réalisées de la saison courante.
 */
export function getTotalDepensesRealise(
  accountClasses: AccountClass[],
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  mode: 'realise' | 'previsionnel'
): number {
  const classified = accountClasses
    .filter(ac => ac.type === 'depense')
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'depense', mode, accountClasses), 0);
  // Le résidu fait partie du total : c'est ce qui le rend égal à celui du bilan analytique.
  return classified + getClassSumRealise(categories, report, prevReport, UNCLASSIFIED_CLASS_CODE, 'depense', mode, accountClasses);
}

/**
 * Somme globale des recettes réalisées de la saison courante.
 */
export function getTotalRecettesRealise(
  accountClasses: AccountClass[],
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  mode: 'realise' | 'previsionnel'
): number {
  const classified = accountClasses
    .filter(ac => ac.type === 'recette')
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'recette', mode, accountClasses), 0);
  // Le résidu fait partie du total : c'est ce qui le rend égal à celui du bilan analytique.
  return classified + getClassSumRealise(categories, report, prevReport, UNCLASSIFIED_CLASS_CODE, 'recette', mode, accountClasses);
}
