import { type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { licencesHorsCategorie } from '../shared/roster-category';
import { TeamNotFoundError } from '../shared/errors';
import { SaveTeamRosterRepository } from './repository';
import type { SaveTeamRosterInput, SaveTeamRosterOutput } from './dto';

const repo = new SaveTeamRosterRepository();

/**
 * Fixe l'effectif d'une équipe.
 *
 * L'effectif est **indicatif** : le règlement autorise un joueur à évoluer dans n'importe
 * quelle équipe de son club, sous réserve des règles de valeur et de titularisation. Il
 * sert à présélectionner dans l'écran de composition, jamais à interdire — c'est pourquoi
 * il n'est validé qu'au regard du référentiel des adhérents et de la **catégorie d'âge**
 * du championnat : une équipe vétérans n'enrôle que des vétérans. La catégorie se lit
 * sur la date de naissance de l'adhésion, connue de tous dès l'inscription.
 *
 * Les licences inconnues sont **écartées et signalées**, plutôt que de faire échouer
 * l'enregistrement : une saisie de quinze joueurs ne doit pas être perdue parce que le
 * bureau n'a pas encore importé le seizième.
 */
export async function saveTeamRoster(
  db: DbOrTx,
  input: SaveTeamRosterInput,
  now: Date = new Date()
): Promise<SaveTeamRosterOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const directory = await loadPlayerDirectory(db, team.seasonCode);

  // `Set` : le même joueur sélectionné deux fois n'est pas une erreur de l'utilisateur,
  // et l'index unique refuserait l'insertion du lot entier.
  const requested = [...new Set(input.licences.map(normalizeLicence))];
  const { categories } = CHAMPIONSHIP_RULES[team.championship];
  const horsCategorie = new Set(licencesHorsCategorie(categories, directory, team.seasonCode));
  const accepted = requested.filter((licence) => directory.has(licence) && !horsCategorie.has(licence));
  const rejected = requested.filter((licence) => !directory.has(licence));
  const outOfCategory = requested.filter((licence) => horsCategorie.has(licence));

  await repo.replaceRoster(db, team.id, accepted, now);

  return { teamId: team.id, count: accepted.length, rejected, outOfCategory };
}
