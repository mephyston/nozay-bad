import { type Db, type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { loadLineup } from '../get-lineup/handler';
import { notifyLineup } from '../notify-lineup/handler';
import { notifyValueOverflow } from '../notify-value-overflow/handler';
import {
  ChampionshipDayNotFoundError,
  InvalidLineupError,
  NotTeamCaptainError,
  RostersNotPublishedError,
  TeamNotFoundError
} from '../shared/errors';
import { areRostersPublished } from '../shared/rosters-publication';
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
 *
 * **Brouillon et publication.** Un brouillon n'est vu que du capitaine et de son
 * adjoint. Valider le publie à l'équipe. Une composition publiée qu'on retouche le reste
 * — l'équipe est reprévenue — et seul `unpublish` la fait redevenir brouillon. Rien ne
 * se compose tant que le coach n'a pas publié les effectifs du championnat.
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
  if (!(await areRostersPublished(db, team))) throw new RostersNotPublishedError();

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

  // Lu **avant** l'écriture : une composition déjà publiée qui change doit reprévenir
  // ceux qui s'étaient organisés dessus, et un retrait doit les retrouver.
  const previous = await repo.storedLines(db, fixture.id);
  const wasValidated = previous.some((line) => line.status === 'validated');
  const published = !input.unpublish && Boolean(input.validate || wasValidated);

  await repo.replaceLines(
    db,
    fixture.id,
    lines.map((line) => ({
      fixtureId: fixture.id,
      discipline: line.discipline,
      position: line.position,
      licence1: line.licence1,
      licence2: line.licence2,
      status: published ? ('validated' as const) : ('draft' as const),
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
   * se perdrait dans le lot. L'envoi part quand le capitaine publie, quand il touche à
   * une composition publiée, et quand il la retire.
   *
   * Attendu, jamais détaché : une promesse laissée en suspens est annulée avec la requête
   * sur Workers, et l'envoi disparaîtrait sans laisser de trace.
   */
  if (published || wasValidated) {
    await notifyLineup(
      db as Db,
      {
        team: { id: team.id, seasonCode: team.seasonCode },
        lineup: saved,
        authorLicence: licence,
        kind: !published ? 'withdrawn' : wasValidated ? 'updated' : 'published',
        previouslySelected: previous.flatMap((line) => [line.licence1, ...(line.licence2 ? [line.licence2] : [])])
      },
      now
    );
  }
  if (published) {
    // Constat de valeur d'équipe, dans les deux directions : la composition qui vient
    // d'être arrêtée peut dépasser l'équipe du dessus comme passer sous une composition
    // validée du dessous. Jamais sur brouillon — il bouge encore. Attendu lui aussi :
    // une promesse détachée est annulée avec la requête sur Workers.
    await notifyValueOverflow(
      db as Db,
      { teamId: team.id, dayNumber: input.dayNumber, slot: fixtureSlot },
      now
    );
  }

  return saved;
}
