import { type DbOrTx } from '@nba/db';
import { getSeasonId } from '@nba/accounting-api';
import {
  CLUB_FUNCTION_LABELS,
  SINGLE_HOLDER_FUNCTIONS,
  type ClubFunction
} from '../shared/club-functions';
import { ClubFunctionConflictError, MemberNotFoundError, SeasonNotFoundError } from '../shared/errors';
import { findHolders, findMemberBySeasonLicence, replaceFunctions } from './repository';
import type { SaveClubFunctionsInput, SaveClubFunctionsOutput } from './dto';

/**
 * Attribue la fonction au club d'un adhérent pour une saison.
 *
 * Sémantique de **remplacement** : la liste reçue est l'état final (une fonction au
 * plus), une liste vide retire la fonction — même contrat que la désignation du staff
 * d'équipe, pour que l'écran n'ait jamais à raisonner en deltas.
 *
 * Trois règles :
 *   * la licence doit figurer au référentiel des adhérents de la saison — une fonction
 *     attribuée à une licence inconnue ne notifierait personne ;
 *   * **pas de cumul** : un adhérent ne porte qu'une fonction par saison — le président
 *     ne peut pas être aussi trésorier ;
 *   * président, trésorier et trésorier adjoint n'ont qu'un titulaire par saison
 *     (statuts du club). Le refus nomme le titulaire actuel : c'est lui qu'il faut
 *     d'abord relever de sa fonction, et l'écran doit pouvoir le dire.
 */
export async function saveClubFunctions(
  db: DbOrTx,
  input: SaveClubFunctionsInput,
  now: Date = new Date()
): Promise<SaveClubFunctionsOutput> {
  const seasonId = await getSeasonId(db, input.season);
  if (seasonId === undefined) throw new SeasonNotFoundError();

  const licence = input.licence.trim();
  const functions = [...new Set(input.functions)];
  if (functions.length > 1) {
    throw new ClubFunctionConflictError(
      'Un adhérent ne porte qu’une seule fonction au club par saison.'
    );
  }

  const member = await findMemberBySeasonLicence(db, seasonId, licence);
  if (!member) {
    throw new MemberNotFoundError(
      `La licence ${licence} ne figure pas au référentiel des adhérents de la saison.`
    );
  }

  const singles = functions.filter((fn) => SINGLE_HOLDER_FUNCTIONS.includes(fn));
  if (singles.length > 0) {
    const holders = await findHolders(db, seasonId, singles as ClubFunction[]);
    const conflict = holders.find((holder) => holder.licence !== licence);
    if (conflict) {
      const name =
        [conflict.firstName, conflict.lastName].filter(Boolean).join(' ').trim() ||
        `la licence ${conflict.licence}`;
      throw new ClubFunctionConflictError(
        `La fonction ${CLUB_FUNCTION_LABELS[conflict.function]} est déjà attribuée à ${name} sur cette saison. Retirez-la d'abord de sa fiche.`
      );
    }
  }

  await replaceFunctions(db, seasonId, licence, functions, now);
  return { licence, functions };
}
