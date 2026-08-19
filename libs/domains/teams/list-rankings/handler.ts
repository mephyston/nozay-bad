import { type DbOrTx } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { normalizeLicence } from '../shared/ranking';
import { ListRankingsRepository } from './repository';
import type { ListRankingsInput, ListRankingsOutput } from './dto';

const repo = new ListRankingsRepository();

/**
 * Classements à une date donnée, marqués de leur rapprochement avec les adhérents.
 *
 * Sans date demandée on retient la plus récente : c'est ce que le coach veut voir après
 * un import. La **date de référence** d'un championnat, elle, ne se déduit jamais ainsi —
 * elle est épinglée, et c'est `ranking-resolution.ts` qui la tranche.
 */
export async function listRankings(
  db: DbOrTx,
  input: ListRankingsInput
): Promise<ListRankingsOutput> {
  const availableDates = await repo.listDates(db);
  const eloDate = input.eloDate ?? availableDates[0]?.eloDate ?? null;

  if (!eloDate) {
    return { eloDate: null, availableDates, rows: [], unmatchedCount: 0 };
  }

  const [rows, members] = await Promise.all([
    repo.listAt(db, eloDate),
    getMembersBySeason(db, input.seasonCode)
  ]);

  const knownLicences = new Set(members.map((m) => normalizeLicence(m.licence)));
  const items = rows.map((row) => ({ ...row, isMember: knownLicences.has(row.licence) }));

  return {
    eloDate,
    availableDates,
    // Les non-adhérents remontent en tête : ils appellent une action du bureau, et
    // enterrés au milieu de deux cents lignes ils ne seraient jamais traités.
    rows: [...items].sort((a, b) => Number(a.isMember) - Number(b.isMember)),
    unmatchedCount: items.filter((item) => !item.isMember).length
  };
}
