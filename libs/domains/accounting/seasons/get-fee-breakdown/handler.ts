import { AppError, type Db } from '@nba/db';
import { resolveLegacyTransferCategoryId } from '../../shared/entry-classification';
import { GetFeeBreakdownRepository, type SeasonRef } from './repository';
import { computeFeeBreakdown } from './compute';
import type { AmountRow, CountMembers, FeeBreakdown, FeeBreakdownSource } from './dto';

export interface GetFeeBreakdownOptions {
  seasonCode?: string;
  countMembers: CountMembers;
  /** Le détail par catégorie : pour le bureau, pas pour l'espace adhérent. */
  withDetails?: boolean;
}

const depenses = (rows: AmountRow[]) => rows.filter((r) => r.type === 'depense').reduce((s, r) => s + r.cents, 0);

/**
 * Ce que coûte un adhérent sur la saison, et qui le finance.
 *
 * Le réalisé d'une saison en cours ment sur les proportions : en novembre, deux mois de
 * salaires pèsent face à toutes les licences, déjà payées. D'où l'ordre des sources : le
 * **budget** de la saison s'il est saisi, sinon le **réalisé de la saison précédente**, et
 * le réalisé en cours seulement faute de mieux.
 */
export async function getFeeBreakdown(db: Db, options: GetFeeBreakdownOptions): Promise<FeeBreakdown> {
  const repo = new GetFeeBreakdownRepository();
  const season = await repo.findSeason(db, options.seasonCode);
  if (!season) throw new AppError(options.seasonCode ? 'Saison introuvable.' : 'Aucune saison active.', 404);

  const [budget, current, categories, rubriques] = await Promise.all([
    repo.budgetRows(db, season.id),
    repo.realisedRows(db, season.id),
    repo.categories(db),
    repo.rubriques(db)
  ]);

  let source: FeeBreakdownSource = 'budget';
  let sourceSeason: SeasonRef = season;
  let rows = budget;
  if (rows.length === 0) {
    const previous = await repo.findPreviousSeason(db, season.startDate);
    const previousRows = previous ? await repo.realisedRows(db, previous.id) : [];
    if (previous && previousRows.length > 0) {
      source = 'previous';
      sourceSeason = previous;
      rows = previousRows;
    } else {
      source = 'current';
      rows = current;
    }
  }

  const memberCount = await options.countMembers(sourceSeason.id);
  const excludedCategoryId = resolveLegacyTransferCategoryId(categories);
  const totals = computeFeeBreakdown({
    rows,
    categories,
    rubriques,
    memberCount,
    excludedCategoryId,
    withDetails: !!options.withDetails
  });

  const perMember = (cents: number) => (memberCount > 0 ? Math.round(cents / memberCount) : 0);
  const costPerMemberCents = perMember(totals.totalChargesCents);
  const averageFeeCents = perMember(totals.membershipFeesCents);
  const sansTransferts = (r: AmountRow) => r.categoryId === null || r.categoryId !== excludedCategoryId;

  return {
    season: season.code,
    source,
    sourceSeason: sourceSeason.code,
    memberCount,
    ...totals,
    costPerMemberCents,
    averageFeeCents,
    feeCoverage: totals.totalChargesCents > 0 ? totals.membershipFeesCents / totals.totalChargesCents : 0,
    gapPerMemberCents: Math.max(0, costPerMemberCents - averageFeeCents),
    resultCents: totals.totalResourcesCents - totals.totalChargesCents,
    progress: source === 'budget'
      ? { realisedChargesCents: depenses(current.filter(sansTransferts)), plannedChargesCents: depenses(budget) }
      : null
  };
}
