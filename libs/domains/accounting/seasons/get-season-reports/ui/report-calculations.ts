import type { DbCategory, AccountClass, ReportData } from './report-types';

export function getClassCategories(
  categories: DbCategory[],
  classCode: string,
  type: 'recette' | 'depense',
  accountClasses?: AccountClass[]
): DbCategory[] {
  const targetClass = accountClasses?.find(ac => ac.code === classCode || String((ac as any).id) === classCode);
  const targetClassId = targetClass ? (targetClass as any).id : null;

  // Filtrer les catégories uniques par adminLabel pour éviter les doublons d'affichage
  const seenLabels = new Set<string>();

  return categories.filter(cat => {
    const rawVal = type === 'recette'
      ? (cat.receiptCode || (cat as any).receiptAccountClassId)
      : (cat.expenseCode || (cat as any).expenseAccountClassId);

    if (rawVal === undefined || rawVal === null) return false;

    const strVal = String(rawVal);
    let matches = strVal === classCode;
    if (!matches && targetClassId !== null && targetClassId !== undefined && (rawVal === targetClassId || strVal === String(targetClassId))) {
      matches = true;
    }

    if (!matches) {
      const defaultClassMap: Record<string, string[]> = {
        '70': ['1', '70'],
        '74': ['2', '74'],
        '75': ['3', '75'],
        '60': ['4', '60'],
        '61': ['5', '61'],
        '62': ['6', '62'],
        '63': ['7', '63'],
        '64': ['8', '64'],
        '65': ['9', '65']
      };
      const allowed = defaultClassMap[classCode];
      if (allowed && allowed.includes(strVal)) {
        matches = true;
      }
    }

    if (!matches) return false;

    if (seenLabels.has(cat.adminLabel)) return false;
    seenLabels.add(cat.adminLabel);
    return true;
  });
}

export function getCatTotal(
  report: ReportData,
  prevReport: ReportData | null,
  id: string,
  type: 'recette' | 'depense',
  mode: 'realise' | 'previsionnel',
  categories?: DbCategory[]
): number {
  const reportToUse = mode === 'previsionnel' && prevReport ? prevReport : report;
  if (!reportToUse || !reportToUse.compteResultat || !reportToUse.compteResultat.categories) return 0;

  const directTotal = reportToUse.compteResultat.categories[`${id}_${type}`]?.total;
  if (directTotal !== undefined) return directTotal;

  if (categories) {
    const currentCat = categories.find(c => String(c.id) === id);
    if (currentCat) {
      const sameNameCats = categories.filter(c => c.adminLabel === currentCat.adminLabel);
      for (const cat of sameNameCats) {
        const total = reportToUse.compteResultat.categories[`${cat.id}_${type}`]?.total;
        if (total !== undefined && total > 0) return total;
      }
    }
  }

  return 0;
}

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
    sum += getCatTotal(report, prevReport, cat.id.toString(), type, mode, categories);
  }
  return sum;
}

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
