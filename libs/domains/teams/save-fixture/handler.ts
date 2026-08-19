import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { mondayOf } from '../shared/week';
import {
  ChampionshipDayNotFoundError,
  InvalidLineupError,
  TeamNotFoundError
} from '../shared/errors';
import { SaveFixtureRepository } from './repository';
import type { SaveFixtureInput, SaveFixtureOutput } from './dto';

const repo = new SaveFixtureRepository();

/**
 * Place la rencontre d'une équipe sur une journée.
 *
 * Deux refus, destinés à empêcher un calendrier incohérent de produire des contrôles
 * silencieusement faux :
 *
 *   * **La journée doit appartenir au championnat de l'équipe.** Rattacher une équipe de
 *     mixte à une journée de masculin ferait comparer sa valeur à celle d'équipes d'un
 *     autre championnat, où la hiérarchie ne s'applique pas.
 *   * **Le slot doit tenir dans ce que le championnat autorise.** Seul le régional dispute
 *     deux rencontres par journée ; ailleurs, un second slot dédoublerait l'équipe.
 *
 * Une rencontre disputée **hors de la semaine de sa journée** n'est en revanche pas une
 * erreur : c'est un **report** (art. 4.2.3), et il arrive — gymnase indisponible,
 * intempéries. On l'enregistre et on le signale, mais la **journée ne bouge pas**.
 *
 * C'est le partage essentiel : la semaine théorique de la journée est figée et porte
 * toutes les règles transverses — valeur d'équipe, mouvements, unicité d'équipe. La date
 * réelle ne relève que de la logistique. Les confondre laisserait un aléa de gymnase
 * modifier ce que le règlement autorise.
 */
export async function saveFixture(
  db: DbOrTx,
  input: SaveFixtureInput,
  now: Date = new Date()
): Promise<SaveFixtureOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const day = await repo.findDay(db, input.dayId);
  if (!day) throw new ChampionshipDayNotFoundError();

  if (day.championship !== team.championship || day.seasonCode !== team.seasonCode) {
    throw new InvalidLineupError(
      "Cette journée n'appartient pas au championnat de l'équipe."
    );
  }

  const rules = CHAMPIONSHIP_RULES[team.championship];
  const slot = input.slot ?? 1;
  if (slot > rules.fixturesPerDay) {
    throw new InvalidLineupError(
      `${rules.label} ne dispute qu'${rules.fixturesPerDay === 1 ? 'une seule rencontre' : `${rules.fixturesPerDay} rencontres`} par journée.`
    );
  }

  const outsideTheoreticalWeek = Boolean(
    input.playedAt && mondayOf(input.playedAt.slice(0, 10)) !== day.weekStart
  );

  const row = await repo.upsert(db, {
    teamId: team.id,
    dayId: day.id,
    slot,
    status: input.status ?? 'scheduled',
    playedAt: input.playedAt ?? null,
    home: input.home ?? true,
    opponent: input.opponent ?? null,
    venue: input.venue ?? null,
    createdAt: now
  });

  return {
    id: row.id,
    teamId: row.teamId,
    dayId: row.dayId,
    slot: row.slot,
    outsideTheoreticalWeek
  };
}
