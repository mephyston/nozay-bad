import type { DbCategory, AccountClass, ReportData } from './report-types';

export function getClassCategories(categories: DbCategory[], classCode: string, type: 'recette' | 'depense'): DbCategory[] {
  return categories.filter(cat => {
    const code = type === 'recette' ? cat.receiptCode : cat.expenseCode;
    return code === classCode;
  });
}

export function getCatTotal(report: ReportData, prevReport: ReportData | null, id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel'): number {
  const reportToUse = mode === 'previsionnel' && prevReport ? prevReport : report;
  return reportToUse.compteResultat.categories[`${id}_${type}`]?.total || 0;
}

export function getClassSumRealise(
  categories: DbCategory[],
  report: ReportData,
  prevReport: ReportData | null,
  classCode: string,
  type: 'recette' | 'depense',
  mode: 'realise' | 'previsionnel'
): number {
  const classCats = getClassCategories(categories, classCode, type);
  let sum = 0;
  for (const cat of classCats) {
    sum += getCatTotal(report, prevReport, cat.id.toString(), type, mode);
  }
  return sum;
}

export function getClassSumPrevisionnel(
  categories: DbCategory[],
  editableBudget: Record<string, number>,
  classCode: string,
  type: 'recette' | 'depense'
): number {
  const classCats = getClassCategories(categories, classCode, type);
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
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'depense', mode), 0);
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
    .reduce((sum, ac) => sum + getClassSumRealise(categories, report, prevReport, ac.code, 'recette', mode), 0);
}
