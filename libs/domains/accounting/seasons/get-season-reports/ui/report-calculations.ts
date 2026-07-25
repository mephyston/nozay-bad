import type { DbCategory, AccountClass, ReportData } from './report-types';

/**
 * Renvoie la liste des catégories comptables rattachées à une classe de compte donnée (ex: '70', '60').
 * La correspondance s'effectue strictement par clé étrangère / ID de classe comptable (FK).
 */
export function getClassCategories(
  categories: DbCategory[],
  classCode: string,
  type: 'recette' | 'depense',
  accountClasses?: AccountClass[]
): DbCategory[] {
  const targetClass = accountClasses?.find(ac => ac.code === classCode || String((ac as any).id) === classCode);
  const targetClassId = targetClass ? (targetClass as any).id : null;

  return categories.filter(cat => {
    const fkVal = type === 'recette'
      ? (cat.receiptCode || (cat as any).receiptAccountClassId)
      : (cat.expenseCode || (cat as any).expenseAccountClassId);

    if (fkVal === undefined || fkVal === null) return false;

    const fkStr = String(fkVal);

    // 1. Correspondance par code textuel de la classe (ex: '70' === '70')
    if (fkStr === classCode) return true;

    // 2. Correspondance par identifiant numérique de la classe (ex: receiptAccountClassId === targetClass.id)
    if (targetClassId !== null && targetClassId !== undefined) {
      if (fkVal === targetClassId || fkStr === String(targetClassId)) return true;
    }

    return false;
  });
}

/**
 * Récupère le montant total réalisé ou prévisionnel pour une catégorie et un type d'écriture (recette/dépense).
 * La clé dans report.compteResultat.categories est "${categoryId}_${type}".
 */
export function getCatTotal(
  report: ReportData,
  prevReport: ReportData | null,
  id: string,
  type: 'recette' | 'depense',
  mode: 'realise' | 'previsionnel'
): number {
  const reportToUse = mode === 'previsionnel' && prevReport ? prevReport : report;
  if (!reportToUse || !reportToUse.compteResultat || !reportToUse.compteResultat.categories) return 0;

  return reportToUse.compteResultat.categories[`${id}_${type}`]?.total || 0;
}

/**
 * Calcule la somme totale réalisée des catégories appartenant à une classe de compte.
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
  const classCats = getClassCategories(categories, classCode, type, accountClasses);
  let sum = 0;
  for (const cat of classCats) {
    sum += getCatTotal(report, prevReport, cat.id.toString(), type, mode);
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
 * Somme globale des dépenses réalisées ou prévisionnelles.
 */
export function getTotalDepensesRealise(
  accountClasses: AccountClass[],
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  mode: 'realise' | 'previsionnel'
): number {
  return accountClasses
    .filter(ac => ac.type === 'depense')
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'depense', mode, accountClasses), 0);
}

/**
 * Somme globale des recettes réalisées ou prévisionnelles.
 */
export function getTotalRecettesRealise(
  accountClasses: AccountClass[],
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  mode: 'realise' | 'previsionnel'
): number {
  return accountClasses
    .filter(ac => ac.type === 'recette')
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'recette', mode, accountClasses), 0);
}
