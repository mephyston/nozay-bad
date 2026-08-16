import { type DbOrTx } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { parseRankingCsv, RankingCsvFormatError } from '../shared/ranking-csv';
import { normalizeLicence } from '../shared/ranking';
import { InvalidRankingFileError, RankingDateMissingError } from '../shared/errors';
import { ImportRankingsRepository } from './repository';
import type { ImportRankingsInput, ImportRankingsOutput, UnmatchedCompetitor } from './dto';

const repo = new ImportRankingsRepository();

/**
 * Importe un export ELO Poona.
 *
 * L'opération **complète** le référentiel des adhérents, elle ne l'alimente pas : aucun
 * adhérent n'est créé ici. Les compétiteurs qui n'y figurent pas sont enregistrés — leur
 * classement est une donnée juste, seul le calendrier des deux imports diverge — mais
 * remontés à l'appelant pour que le bureau relance l'import des adhérents. Tant que le
 * rapprochement n'est pas fait, ces joueurs n'apparaissent dans aucun sélecteur de
 * composition, puisque ceux-ci sont alimentés par les adhérents.
 */
export async function importRankings(
  db: DbOrTx,
  input: ImportRankingsInput,
  now: Date = new Date()
): Promise<ImportRankingsOutput> {
  let parsed;
  try {
    parsed = parseRankingCsv(input.content);
  } catch (error) {
    if (error instanceof RankingCsvFormatError) throw new InvalidRankingFileError(error.message);
    throw error;
  }

  // La date confirmée par l'utilisateur prime sur celle lue : c'est elle qui décide quel
  // classement fait foi, et l'écran la lui a fait valider.
  const eloDate = input.eloDate ?? parsed.eloDate;
  if (!eloDate) throw new RankingDateMissingError();

  const members = await getMembersBySeason(db, input.seasonCode);
  const knownLicences = new Set(members.map((m) => normalizeLicence(m.licence)));

  const competitors = parsed.rows.filter((row) => !row.nonCompetitor);
  const unmatched: UnmatchedCompetitor[] = competitors
    .filter((row) => !knownLicences.has(row.licence))
    .map(({ licence, lastName, firstName }) => ({ licence, lastName, firstName }));

  const imported = await repo.upsertMany(
    db,
    parsed.rows.map((row) => ({
      licence: row.licence,
      eloDate,
      seasonCode: row.seasonCode || input.seasonCode,
      lastName: row.lastName,
      firstName: row.firstName,
      gender: row.gender,
      category: row.category || null,
      mutation: row.mutation,
      singles: row.singles,
      doubles: row.doubles,
      mixed: row.mixed,
      singlesRank: row.singlesRank,
      doublesRank: row.doublesRank,
      mixedRank: row.mixedRank,
      cpphSingles: row.cpphSingles,
      cpphDoubles: row.cpphDoubles,
      cpphMixed: row.cpphMixed,
      source: 'import' as const,
      updatedAt: now
    }))
  );

  const nonCompetitors = parsed.rows.length - competitors.length;

  await repo.recordImport(db, {
    eloDate,
    seasonCode: input.seasonCode,
    fileName: input.fileName ?? null,
    rowsImported: imported,
    nonCompetitors,
    unmatchedMembers: unmatched.length,
    importedAt: now
  });

  return {
    eloDate,
    seasonCodes: parsed.seasonCodes,
    imported,
    nonCompetitors,
    unmatched,
    errors: parsed.errors
  };
}
