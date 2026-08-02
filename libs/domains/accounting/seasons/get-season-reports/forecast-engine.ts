import { AppError } from '@nba/db';
import { CategoryProjection, ForecastDataPoint } from './dto';

// Represents a historical transaction to compute seasonality
export interface HistoricalTransaction {
  amountCents: number;
  date: string; // YYYY-MM-DD
  categoryId: number | null;
  type: 'recette' | 'depense' | 'transfert';
  seasonId: number;
}

export interface SeasonInfo {
  id: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface MonthlyHistory {
  monthIndex: number;
  currentCents: number;
  savingsCents: number;
  realRecettesCents: number;
  realDepensesCents: number;
}

export function getRelativeMonth(seasonStart: string, txDate: string): number {
  const start = new Date(seasonStart);
  const tx = new Date(txDate);
  const months = (tx.getFullYear() - start.getFullYear()) * 12 + (tx.getMonth() - start.getMonth());
  return months >= 0 ? months : 0;
}

export function generateTreasuryForecast(
  currentSeason: SeasonInfo,
  pastSeasons: SeasonInfo[],
  pastTransactions: HistoricalTransaction[],
  categoryProjections: CategoryProjection[],
  history: MonthlyHistory[],
  effectiveEndDate: string, // The date up to which we have real data
  initCurrent: number = 0,
  initSavings: number = 0
): ForecastDataPoint[] {
  
  // 1. Compute historical weights per category and relative month
  const categoryMonthlySums: Record<string, number[]> = {};
  const categoryTotals: Record<string, number> = {};

  const seasonMap = new Map(pastSeasons.map(s => [s.id, s]));

  for (const tx of pastTransactions) {
    if (tx.type === 'transfert' || tx.categoryId === null) continue;
    const season = seasonMap.get(tx.seasonId);
    if (!season) continue;

    let relMonth = getRelativeMonth(season.startDate, tx.date);
    const key = `${tx.categoryId}_${tx.type}`;

    if (!categoryMonthlySums[key]) {
      categoryMonthlySums[key] = Array(12).fill(0);
      categoryTotals[key] = 0;
    }

    if (relMonth < 12) {
      if (relMonth >= 0) {
        categoryMonthlySums[key][relMonth] += tx.amountCents;
      }
      // We always add to total even if relMonth < 0 (like PCAs) 
      // so that weightSumForRemaining < 1.0, properly reflecting that some budget was realized before month 0
      categoryTotals[key] += tx.amountCents;
    }
  }

  // Calculate weights
  const categoryWeights: Record<string, number[]> = {};
  for (const key of Object.keys(categoryMonthlySums)) {
    categoryWeights[key] = Array(12).fill(0);
    if (categoryTotals[key] > 0) {
      for (let i = 0; i < 12; i++) {
        categoryWeights[key][i] = categoryMonthlySums[key][i] / categoryTotals[key];
      }
    }
  }

  // 2. Initialize the timeline for the current season (12 months)
  const timeline: ForecastDataPoint[] = [];
  const startDate = new Date(currentSeason.startDate);
  
  const startD = new Date(currentSeason.startDate);
  const endD = new Date(effectiveEndDate);
  const rawMonths = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
  const effectiveMonthIndex = Math.min(11, rawMonths);

  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
    const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM
    
    // Label en français
    const label = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    const dp: ForecastDataPoint = {
      month: monthStr,
      label,
      realTotal: null,
      realCurrent: null,
      realSavings: null,
      projectedTotal: null,
      projectedCurrent: null,
      projectedSavings: null,
      projectedRecettes: 0,
      projectedDepenses: 0
    };

    timeline.push(dp);
  }

  // Set real history
  let lastRealCurrent = initCurrent;
  let lastRealSavings = initSavings;
  
  for (const h of history) {
    if (h.monthIndex >= 0 && h.monthIndex < 12) {
      timeline[h.monthIndex].realCurrent = h.currentCents;
      timeline[h.monthIndex].realSavings = h.savingsCents;
      timeline[h.monthIndex].realTotal = h.currentCents + h.savingsCents;
      
      // The projected curve matches the real curve in the past
      timeline[h.monthIndex].projectedCurrent = h.currentCents;
      timeline[h.monthIndex].projectedSavings = h.savingsCents;
      timeline[h.monthIndex].projectedTotal = h.currentCents + h.savingsCents;
      
      // Show actual realized revenues and expenses in the table for past months
      timeline[h.monthIndex].projectedRecettes = h.realRecettesCents;
      timeline[h.monthIndex].projectedDepenses = h.realDepensesCents;

      if (h.monthIndex <= effectiveMonthIndex) {
        lastRealCurrent = h.currentCents;
        lastRealSavings = h.savingsCents;
      }
    }
  }

  // If some past months have no history (e.g. gaps), fill them with the previous month's balance
  let runningCurrentForFill = initCurrent;
  let runningSavingsForFill = initSavings;
  for (let m = 0; m <= effectiveMonthIndex; m++) {
    if (timeline[m].realTotal === null) {
       timeline[m].realCurrent = runningCurrentForFill;
       timeline[m].realSavings = runningSavingsForFill;
       timeline[m].realTotal = runningCurrentForFill + runningSavingsForFill;
       timeline[m].projectedCurrent = runningCurrentForFill;
       timeline[m].projectedSavings = runningSavingsForFill;
       timeline[m].projectedTotal = runningCurrentForFill + runningSavingsForFill;
    } else {
       runningCurrentForFill = timeline[m].realCurrent!;
       runningSavingsForFill = timeline[m].realSavings!;
    }
  }

  // Distribute remaining budget for FUTURE months
  for (const proj of categoryProjections) {
    if (proj.remainingBudgetCents <= 0) continue;

    const key = `${proj.categoryId}_${proj.type}`;
    const weights = categoryWeights[key];

    const remainingMonthsCount = 11 - effectiveMonthIndex;
    
    if (remainingMonthsCount > 0) {
      let weightSumForRemaining = 0;
      if (weights) {
        for (let m = effectiveMonthIndex + 1; m < 12; m++) {
          weightSumForRemaining += weights[m];
        }
      }

      for (let m = effectiveMonthIndex + 1; m < 12; m++) {
        let amount = 0;
        if (weights && weightSumForRemaining > 0) {
          amount = Math.round(proj.remainingBudgetCents * (weights[m] / weightSumForRemaining));
        } else {
          amount = Math.round(proj.remainingBudgetCents / remainingMonthsCount);
        }

        const isSavings = proj.categoryName && proj.categoryName.includes('Livret A');

        if (proj.type === 'recette') {
          timeline[m].projectedRecettes += amount;
          if (isSavings) (timeline[m] as any)._savingsRecettes = ((timeline[m] as any)._savingsRecettes || 0) + amount;
          else (timeline[m] as any)._currentRecettes = ((timeline[m] as any)._currentRecettes || 0) + amount;
        } else {
          timeline[m].projectedDepenses += amount;
          if (isSavings) (timeline[m] as any)._savingsDepenses = ((timeline[m] as any)._savingsDepenses || 0) + amount;
          else (timeline[m] as any)._currentDepenses = ((timeline[m] as any)._currentDepenses || 0) + amount;
        }
      }
    }
  }

  // Accumulate projected balances
  let projectedCurrent = lastRealCurrent;
  let projectedSavings = lastRealSavings;

  for (let m = effectiveMonthIndex + 1; m < 12; m++) {
    const curRec = (timeline[m] as any)._currentRecettes || 0;
    const curDep = (timeline[m] as any)._currentDepenses || 0;
    const savRec = (timeline[m] as any)._savingsRecettes || 0;
    const savDep = (timeline[m] as any)._savingsDepenses || 0;
    
    projectedCurrent = projectedCurrent + curRec - curDep;
    projectedSavings = projectedSavings + savRec - savDep;
    
    timeline[m].projectedCurrent = projectedCurrent;
    timeline[m].projectedSavings = projectedSavings;
    timeline[m].projectedTotal = projectedCurrent + projectedSavings;
  }

  return timeline;
}
