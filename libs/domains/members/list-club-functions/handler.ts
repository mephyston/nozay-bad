import { type DbOrTx } from '@nba/db';
import { getSeasonAtDate, getSeasonId } from '@nba/accounting-api';
import { REQUIRED_FUNCTIONS } from '../shared/club-functions';
import { findAssignmentsBySeason } from './repository';
import type { ClubFunctionAssignment, ClubFunctionsStatus } from './dto';

/** Fonctions au club attribuées sur une saison (code `25-26` ou identifiant accepté). */
export async function listClubFunctions(
  db: DbOrTx,
  season: string | number
): Promise<ClubFunctionAssignment[]> {
  const seasonId = await getSeasonId(db, season);
  if (seasonId === undefined) return [];
  return findAssignmentsBySeason(db, seasonId);
}

/**
 * Les fonctions indispensables de la **saison en cours** sont-elles pourvues ?
 *
 * Au démarrage d'une saison, la table repart vide : l'assemblée générale élit, quelqu'un
 * doit ressaisir. Ce statut alimente le point d'exclamation du menu « Dirigeants » —
 * une action à réaliser, pas une erreur — qui persiste tant que le **président** et le
 * **trésorier** ne sont pas désignés : un entraîneur saisi ne suffit pas à dire que le
 * bureau est en place. La saison se résout **par la date** (bascule seule au
 * 1er septembre), jamais par le drapeau comptable `active`.
 */
export async function getClubFunctionsStatus(
  db: DbOrTx,
  todayIso: string
): Promise<ClubFunctionsStatus> {
  const season = await getSeasonAtDate(db, todayIso);
  if (!season) return { seasonCode: null, defined: 0, missing: [] };
  const assignments = await findAssignmentsBySeason(db, season.id);
  const held = new Set(assignments.map((a) => a.function));
  return {
    seasonCode: season.code,
    defined: assignments.length,
    missing: REQUIRED_FUNCTIONS.filter((fn) => !held.has(fn))
  };
}
