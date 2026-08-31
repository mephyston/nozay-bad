import { AppError, type Db } from '@nba/db';
import { getSeasonFromDb } from '../../shared/accruals';
import { resolveAccountId } from '../../config/queries';
import { ListBankStatementLinesRepository } from './repository';
import type { ListBankStatementLinesInput, ListBankStatementLinesOutput } from './dto';

/**
 * Les lignes de relevé d'un exercice.
 *
 * Aucun des trois filtres n'arrivait jusqu'à la requête. `seasonId` était transmis au
 * repository puis abandonné — il ne bâtissait ses conditions que sur un couple de dates que
 * personne ne lui passait ; `status` et `accountId`, eux, étaient cherchés à la racine de
 * l'objet alors que la route les range sous `filters`. L'écran de rapprochement recevait
 * donc **toutes** les lignes jamais importées, tous exercices confondus, sérialisées dans le
 * HTML de la page.
 *
 * Le dto acceptant les deux formes, on lit les deux : un appelant direct qui pose ses filtres
 * à la racine reste servi.
 */
export async function listBankStatementLines(db: Db, input: ListBankStatementLinesInput): Promise<ListBankStatementLinesOutput> {
  const repo = new ListBankStatementLinesRepository();
  const filters = { ...(input as any), ...(input.filters ?? {}) };

  /* Sans exercice demandé, aucune borne de dates : toutes les lignes remontent. */
  const season = input.seasonId ? await getSeasonFromDb(db, input.seasonId) : null;
  if (input.seasonId && !season) {
    throw new AppError('Saison comptable introuvable.', 404);
  }

  /*
   * Le code du compte est résolu en identifiant : `bank_statement_lines.account_id` est une
   * clé étrangère entière, et comparer « current » à un entier ne renvoie jamais rien. Tant
   * que le filtre était ignoré, l'erreur ne se voyait pas ; maintenant qu'il s'applique, elle
   * rendrait la liste vide sans rien dire.
   */
  const accountId = filters.accountId !== undefined && filters.accountId !== null && filters.accountId !== ''
    ? await resolveAccountId(db, filters.accountId)
    : undefined;

  /*
   * Une borne de zéro n'existe pas : elle rendrait une liste vide sans qu'aucun appelant
   * l'ait voulu. `Number('')` valant 0, la distinction compte — la route passe des chaînes.
   */
  const limit = Number(filters.limit) > 0 ? Number(filters.limit) : undefined;
  const offset = Number(filters.offset) > 0 ? Number(filters.offset) : undefined;

  const rawLines = await repo.listBankStatementLines(db, {
    status: filters.status,
    accountId,
    // Un intervalle explicite l'emporte sur celui de l'exercice : il ne peut que le resserrer.
    startDate: filters.startDate ?? season?.startDate,
    endDate: filters.endDate ?? season?.endDate,
    limit,
    offset
  });

  return rawLines.map(line => {
    const cents = line.amountCents ?? (line as any).amount ?? 0;
    return {
      ...line,
      amount: cents,
      amountCents: cents
    };
  }) as any;
}
