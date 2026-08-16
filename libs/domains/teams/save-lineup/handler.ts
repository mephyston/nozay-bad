import { type Db, type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { loadLineup } from '../get-lineup/handler';
import { notifyLineup } from '../notify-lineup/handler';
import {
  ChampionshipDayNotFoundError,
  InvalidLineupError,
  NotTeamCaptainError,
  TeamNotFoundError
} from '../shared/errors';
import { SaveLineupRepository } from './repository';
import type { SaveLineupInput, SaveLineupOutput } from './dto';

const repo = new SaveLineupRepository();

/**
 * Enregistre la composition d'une rencontre.
 *
 * Le droit d'écrire ne vient pas d'un rôle d'administration mais de la **désignation dans
 * l'équipe** : capitaine ou vice-capitaine. L'écran masque le bouton aux autres, mais
 * c'est ici que la règle tient — masquer n'est pas interdire.
 *
 * La composition est jugée **avant** d'être écrite, sur les mêmes règles que celles
 * affichées au capitaine. Les erreurs dures la refusent ; les avertissements — au premier
 * rang desquels la hiérarchie des valeurs — la laissent passer, parce qu'ils dépendent de
 * compositions que d'autres capitaines n'ont pas encore saisies.
 */
export async function saveLineup(
  db: DbOrTx,
  input: SaveLineupInput,
  now: Date = new Date()
): Promise<SaveLineupOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const licence = normalizeLicence(input.licence);
  if (!(await repo.isStaff(db, team.id, licence))) throw new NotTeamCaptainError();

  const day = await repo.findDay(db, team.seasonCode, team.championship, input.dayNumber);
  if (!day) throw new ChampionshipDayNotFoundError();

  const fixtureSlot = input.slot ?? 1;
  const lines = input.lines
    .filter((line) => line.licence1)
    .map((line) => ({
      ...line,
      licence1: normalizeLicence(line.licence1),
      licence2: line.licence2 ? normalizeLicence(line.licence2) : null
    }));

  // Jugée sur la composition soumise, avant écriture : `override` fait travailler le
  // moteur sur ce que le capitaine vient de saisir, pas sur ce qui est encore en base.
  const preview = await loadLineup(db, {
    teamId: team.id,
    dayNumber: input.dayNumber,
    slot: fixtureSlot,
    viewerLicence: licence,
    override: lines
  });

  if (preview.errors.length > 0) {
    throw new InvalidLineupError(preview.errors.map((issue) => issue.message).join(' '));
  }

  const fixture = await repo.ensureFixture(db, team.id, day.id, fixtureSlot, now);

  // Lu **avant** l'écriture : une composition déjà annoncée qui change doit reprévenir
  // ceux qui s'étaient organisés dessus, même si le capitaine ne la revalide pas.
  const wasValidated = await repo.hasValidatedLines(db, fixture.id);

  await repo.replaceLines(
    db,
    fixture.id,
    lines.map((line) => ({
      fixtureId: fixture.id,
      discipline: line.discipline,
      position: line.position,
      licence1: line.licence1,
      licence2: line.licence2,
      status: input.validate ? ('validated' as const) : ('draft' as const),
      updatedByLicence: licence,
      updatedAt: now
    }))
  );

  const saved = await loadLineup(db, {
    teamId: team.id,
    dayNumber: input.dayNumber,
    slot: fixtureSlot,
    viewerLicence: licence
  });

  /*
   * On ne prévient pas à chaque frappe.
   *
   * Un brouillon se construit en plusieurs passes ; notifier l'équipe à chacune apprend
   * aux joueurs à ignorer les notifications, et la seule qui compte — « c'est arrêté » —
   * se perdrait dans le lot. L'envoi part donc quand le capitaine valide, ou quand il
   * touche à une composition déjà validée.
   *
   * Attendu, jamais détaché : une promesse laissée en suspens est annulée avec la requête
   * sur Workers, et l'envoi disparaîtrait sans laisser de trace.
   */
  if (input.validate || wasValidated) {
    await notifyLineup(
      db as Db,
      {
        team: { id: team.id, seasonCode: team.seasonCode },
        lineup: saved,
        authorLicence: licence,
        validated: Boolean(input.validate)
      },
      now
    );
  }

  return saved;
}
