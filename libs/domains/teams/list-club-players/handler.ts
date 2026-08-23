import { type DbOrTx } from '@nba/db';
import { listClubFunctions, CLUB_FUNCTION_LABELS } from '@nba/members-api';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { normalizeLicence } from '../shared/ranking';
import { ListClubPlayersRepository } from './repository';
import type { ClubPlayer, ListClubPlayersInput, ListClubPlayersOutput } from './dto';

const repo = new ListClubPlayersRepository();

/**
 * Moyenne des cotes CPPH connues d'un joueur.
 *
 * Sur les tableaux classés seulement : diviser par trois quoi qu'il arrive punirait le
 * joueur qui ne dispute que le simple, alors que sa cote y est ce qu'elle est.
 */
function averageElo(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number => typeof value === 'number');
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

/**
 * L'annuaire du club : qui est adhérent cette saison, et comment il est classé.
 *
 * **Une divulgation assumée, et bornée.** `GET /teams/rankings` — le barème nominatif
 * complet — reste fermé à l'espace adhérent, et il le reste : il porte l'historique par
 * date, les mutations et le détail de l'import. Ici on ne rend que ce qu'un adhérent lit
 * déjà sur la fiche de n'importe lequel de ses coéquipiers, pour tout le club à la fois :
 * un nom, un visage, une catégorie, trois classements. Rien qui ne figure sur une
 * feuille de rencontre ou sur la page « Dirigeants » du site.
 *
 * L'identité vient du référentiel des adhérents, jamais des classements : un compétiteur
 * extérieur présent dans l'export ELO n'a rien à faire dans l'annuaire du club, et c'est
 * cette résolution-là qui le tient dehors. Elle borne aussi l'annuaire à **la saison
 * demandée** : qui n'a pas repris sa licence n'y figure plus.
 *
 * Le tri est fait ici plutôt qu'en base : l'annuaire tient en deux cents lignes, la
 * moyenne ELO n'existe dans aucune colonne, et le nom se compare selon la locale
 * française — ce que SQLite ne sait pas faire.
 */
export async function listClubPlayers(
  db: DbOrTx,
  input: ListClubPlayersInput
): Promise<ListClubPlayersOutput> {
  const [directory, referenceEloDate, functions] = await Promise.all([
    loadPlayerDirectory(db, input.seasonCode),
    repo.latestEloDate(db),
    listClubFunctions(db, input.seasonCode)
  ]);

  const identities = [...directory.values()];
  const rankings = referenceEloDate
    ? new Map(
        (await repo.rankingsAt(db, identities.map((i) => i.licence), referenceEloDate)).map(
          (row) => [row.licence, row]
        )
      )
    : new Map();

  // Les fonctions désignent l'adhérent par sa licence, écrite à la main dans l'admin :
  // elle passe par la même normalisation que partout ailleurs, sans quoi la jointure
  // échoue en silence sur un zéro de tête manquant.
  const functionOf = new Map(
    functions.map((assignment) => [
      normalizeLicence(assignment.licence),
      CLUB_FUNCTION_LABELS[assignment.function]
    ])
  );

  const players: ClubPlayer[] = identities.map((identity) => {
    const ranking = rankings.get(identity.licence);
    return {
      licence: identity.licence,
      firstName: identity.firstName,
      lastName: identity.lastName,
      photoUpdatedAt: identity.photoUpdatedAt,
      category: ranking?.category ?? null,
      clubFunction: functionOf.get(identity.licence) ?? null,
      singles: ranking?.singles ?? null,
      doubles: ranking?.doubles ?? null,
      mixed: ranking?.mixed ?? null,
      eloAverage: averageElo([ranking?.cpphSingles, ranking?.cpphDoubles, ranking?.cpphMixed]),
      hasRanking: ranking !== undefined
    };
  });

  /*
   * Du plus fort au plus faible, les non-classés à la fin.
   *
   * Ils ne sont pas « à zéro » : ils ne sont pas sur cette échelle du tout. Les ranger
   * avec les cotes les plus basses les ferait lire comme les plus faibles joueurs du
   * club, alors qu'ils n'ont simplement jamais disputé de compétition. Le nom départage
   * à moyenne égale — et c'est le seul tri qui leur reste entre eux.
   */
  players.sort((a, b) => {
    if (a.eloAverage !== b.eloAverage) {
      if (a.eloAverage === null) return 1;
      if (b.eloAverage === null) return -1;
      return b.eloAverage - a.eloAverage;
    }
    return (
      a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr')
    );
  });

  return { players, referenceEloDate };
}
