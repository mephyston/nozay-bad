import { type Db } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { normalizeLicence } from '../shared/ranking';
import { licencesHorsCategorie } from '../shared/roster-category';
import { InvalidRostersError, UnknownChampionshipError } from '../shared/errors';
import { SaveChampionshipRostersRepository } from './repository';
import type { SaveChampionshipRostersInput, SaveChampionshipRostersOutput } from './dto';

const repo = new SaveChampionshipRostersRepository();

/**
 * Remplace d'un coup les effectifs de toutes les équipes d'un championnat.
 *
 * C'est l'écriture de l'outil d'équilibrage : une répartition complète, qui n'a de
 * sens que d'un bloc. L'appliquer équipe par équipe laisserait, entre deux appels, un
 * joueur dans deux équipes ou dans aucune. D'où trois exigences :
 * - **toutes** les équipes actives du championnat, et elles seules ;
 * - aucun joueur dans deux équipes ;
 * - un seul lot d'écriture.
 *
 * Comme pour un effectif saisi à la main, les licences inconnues et les catégories
 * d'âge que le championnat n'admet pas sont écartées et signalées, jamais bloquantes.
 */
export async function saveChampionshipRosters(
  db: Db,
  input: SaveChampionshipRostersInput,
  now: Date = new Date()
): Promise<SaveChampionshipRostersOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const teams = await repo.activeTeams(db, input.seasonCode, input.championship);
  const attendues = new Set(teams.map((t) => t.id));
  const recues = new Set(input.rosters.map((r) => r.teamId));
  if (recues.size !== input.rosters.length || recues.size !== attendues.size || [...recues].some((id) => !attendues.has(id))) {
    throw new InvalidRostersError("La répartition doit couvrir chaque équipe active du championnat, une fois et une seule.");
  }

  const vues = new Set<string>();
  for (const r of input.rosters) {
    for (const licence of new Set(r.licences.map(normalizeLicence))) {
      if (vues.has(licence)) throw new InvalidRostersError(`La licence ${licence} figure dans deux équipes.`);
      vues.add(licence);
    }
  }

  const directory = await loadPlayerDirectory(db, input.seasonCode);
  const horsCategorie = new Set(licencesHorsCategorie(rules.categories, directory, input.seasonCode));
  const rejected = [...vues].filter((l) => !directory.has(l));
  const outOfCategory = [...vues].filter((l) => horsCategorie.has(l));

  const rosters = input.rosters.map((r) => ({
    teamId: r.teamId,
    licences: [...new Set(r.licences.map(normalizeLicence))].filter((l) => directory.has(l) && !horsCategorie.has(l))
  }));
  await db.batch(repo.buildReplaceStatements(db, rosters, now) as never);

  return {
    teams: rosters.length,
    count: rosters.reduce((n, r) => n + r.licences.length, 0),
    rejected,
    outOfCategory
  };
}
