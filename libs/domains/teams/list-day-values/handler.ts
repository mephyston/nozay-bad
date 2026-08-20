import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES, teamName, type Championship } from '../shared/championship';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { loadLineup } from '../get-lineup/handler';
import { ChampionshipDayNotFoundError, UnknownChampionshipError } from '../shared/errors';
import { ListDayValuesRepository } from './repository';
import type { DayTeamValue, DuplicatePlayer, ListDayValuesOutput } from './dto';

const repo = new ListDayValuesRepository();

/**
 * Les valeurs de toutes les équipes d'un championnat sur une journée.
 *
 * C'est la vue qui justifie la fonctionnalité entière : la règle de hiérarchie se
 * contrôle en croisant les compositions de toutes les équipes d'un même championnat, et
 * aucun capitaine ne voit que la sienne. Le règlement fait perdre la rencontre **aux deux
 * équipes** concernées — celle qui est trop forte comme celle qu'elle dépasse.
 *
 * Deux lectures s'y superposent, et elles n'ont pas la même unité :
 * la **hiérarchie** se compare à journée égale, les **doubles alignements** sur la semaine
 * réellement jouée.
 */
export async function listDayValues(
  db: DbOrTx,
  input: { seasonCode: string; championship: Championship; dayNumber: number }
): Promise<ListDayValuesOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const day = await repo.findDay(db, input.seasonCode, input.championship, input.dayNumber);
  if (!day) throw new ChampionshipDayNotFoundError();

  const teams = await repo.teamsOf(db, input.seasonCode, input.championship);
  const directory = await loadPlayerDirectory(db, input.seasonCode);

  /*
   * Les équipes sont chargées **de front**, et non l'une après l'autre.
   *
   * `loadLineup` enchaîne à lui seul une douzaine de requêtes D1 ; en série sur six
   * équipes, l'écran attendait quelque quatre-vingts allers-retours avant de s'afficher —
   * de loin la page la plus lente de l'administration, alors que les tables concernées
   * tiennent en quelques centaines de lignes. Le coût n'était pas le volume mais la
   * latence cumulée.
   *
   * C'est sans risque : `loadLineup` est strictement en lecture et la route n'ouvre
   * aucune transaction, donc rien n'impose un ordre entre les équipes. `Promise.all`
   * préserve par ailleurs l'ordre du tableau, et `teamsOf` le trie déjà par numéro.
   */
  const rows: DayTeamValue[] = await Promise.all(
    teams.map(async (team): Promise<DayTeamValue> => {
      const lineup = await loadLineup(db, { teamId: team.id, dayNumber: input.dayNumber });

      const delta =
        lineup.value !== null && lineup.upperTeamValue !== null
          ? Number((lineup.value - lineup.upperTeamValue).toFixed(4))
          : null;

      const captain = lineup.captainLicence ? directory.get(lineup.captainLicence) : undefined;

      return {
        teamId: team.id,
        name: teamName(team.number),
        number: team.number,
        divisionLabel: lineup.divisionLabel,
        value: lineup.value,
        filledLines: lineup.slots.filter((s) => s.licence1).length,
        expectedLines: lineup.slots.length,
        upperTeamName: lineup.upperTeamName,
        upperTeamValue: lineup.upperTeamValue,
        delta,
        // `null` = pas de réponse, et non « tout va bien » : l'écran doit distinguer les deux.
        conform: delta === null ? null : delta <= 0,
        captainName: captain ? `${captain.firstName} ${captain.lastName}`.trim() : null,
        captainLicence: lineup.captainLicence,
        issues: [...lineup.errors, ...lineup.warnings]
      };
    })
  );

  // ── Joueurs alignés deux fois dans la semaine ──
  const alignments = await repo.alignmentsInWeek(
    db,
    input.seasonCode,
    input.championship,
    day.weekStart
  );

  /*
   * Regroupé par **identifiant** d'équipe, jamais par nom.
   *
   * `NBA91-1` en mixte et `NBA91-1` en masculin sont deux équipes distinctes qui portent
   * légitimement le même nom — le numéro se compte par championnat. Les regrouper par nom
   * fondait les deux en une, et faisait disparaître le doublon que l'on cherche.
   * Le libellé affiché porte donc le championnat.
   */
  const byLicence = new Map<string, Map<number, string>>();
  for (const a of alignments) {
    const teamsById = byLicence.get(a.licence) ?? new Map<number, string>();
    teamsById.set(
      a.team.id,
      `${teamName(a.team.number)} (${CHAMPIONSHIP_RULES[a.team.championship].label})`
    );
    byLicence.set(a.licence, teamsById);
  }

  const duplicatePlayers: DuplicatePlayer[] = [...byLicence.entries()]
    .filter(([, teamsById]) => teamsById.size > 1)
    .map(([licence, teamsById]) => {
      const identity = directory.get(licence);
      return {
        licence,
        name: identity ? `${identity.firstName} ${identity.lastName}`.trim() : `Licence ${licence}`,
        teams: [...teamsById.values()].sort()
      };
    });

  return {
    seasonCode: input.seasonCode,
    championship: input.championship,
    championshipLabel: rules.label,
    dayNumber: day.number,
    dayLabel: day.label,
    weekStart: day.weekStart,
    weekEnd: day.weekEnd,
    // Les vétérans n'ont pas de valeur d'équipe : l'écran n'en affiche donc aucune colonne.
    hasTeamValue: rules.valueFormula !== 'none',
    teams: rows,
    duplicatePlayers
  };
}
