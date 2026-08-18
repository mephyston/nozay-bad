import { type Db } from '@nba/db';
import { getContactEmailsForMembers, getMembersBySeason } from '@nba/members-api';
import { enqueueNotification } from '@nba/notifications-api';
import { CHAMPIONSHIP_RULES, teamName } from '../shared/championship';
import { normalizeLicence } from '../shared/ranking';
import { shiftIsoDate } from '../shared/ranking-resolution';
import {
  findActiveTeams,
  findFixtures,
  findStaffLicences,
  findUpcomingDays,
  findValidatedFixtureIds,
  type ReminderDay,
  type ReminderFixture,
  type ReminderTeam
} from './repository';
import type { RemindLineupsInput, RemindLineupsOutput } from './dto';

/** « samedi 7 novembre » — dates ISO locales, jamais interprétées comme de l'UTC décalable. */
function frenchDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  });
}

/**
 * L'échéance partagée d'une journée pour un championnat : le moment avant lequel toutes
 * les compositions du club doivent être validées pour que le contrôle des valeurs ait
 * encore un sens.
 *
 *   * la **première rencontre** du club (plus petit `played_at`) quand au moins un
 *     capitaine a fixé une date — dès qu'une équipe joue, les valeurs se figent ;
 *   * sinon le **jour commun** fixé par le comité (`match_date`) ;
 *   * sinon le **lundi** de la journée (`week_start`) : la journée commence un lundi,
 *     et sans date connue chaque jour de la semaine peut être jour de match.
 */
function sharedDeadline(
  day: ReminderDay,
  fixtures: ReminderFixture[]
): { kind: 'match' | 'committee' | 'week'; value: string } {
  const playedAts = fixtures
    .filter((f) => f.status === 'scheduled' && f.playedAt)
    .map((f) => f.playedAt as string)
    .sort();
  if (playedAts.length > 0) return { kind: 'match', value: playedAts[0] };
  if (day.matchDate) return { kind: 'committee', value: day.matchDate };
  return { kind: 'week', value: day.weekStart };
}

/**
 * Relance les capitaines dont la composition n'est pas validée à l'approche d'une journée.
 *
 * Le rappel n'existe que là où le **risque de valeur d'équipe** existe : championnats à
 * hiérarchie de valeur où le club aligne **plusieurs** équipes. Une équipe seule dans son
 * championnat n'a personne au-dessus ni en dessous d'elle — la relancer n'apprendrait
 * rien à personne.
 *
 * La relance part la veille de l'échéance partagée, puis chaque jour (la dédup par
 * `source` + 20 h fait le quotidien, le cron peut être ré-invoqué sans doublon), et
 * s'arrête quand la composition est validée, quand l'horaire de la première rencontre
 * est dépassé, ou à la fin de la semaine de la journée quand aucune date n'est connue.
 * Une rencontre reportée au-delà de sa semaine sort du radar à la fin de celle-ci : le
 * report est exceptionnel, et les valeurs se jugent sur la semaine théorique.
 *
 * Budget D1 (plan gratuit, ~50 sous-requêtes par invocation) : cinq requêtes agrégées
 * quel que soit le nombre d'équipes, puis une résolution d'adresses et une mise en file
 * par équipe effectivement relancée — la dédup quotidienne écrase le coût des passages
 * suivants.
 */
export async function remindMissingLineups(
  db: Db,
  input: RemindLineupsInput,
  now: Date = new Date()
): Promise<RemindLineupsOutput> {
  const todayIso = input.parisNow.slice(0, 10);
  const reminded: RemindLineupsOutput['reminded'] = [];

  const teams = await findActiveTeams(db, input.seasonCode);
  const byChampionship = new Map<string, ReminderTeam[]>();
  for (const team of teams) {
    const list = byChampionship.get(team.championship) ?? [];
    list.push(team);
    byChampionship.set(team.championship, list);
  }
  const atRiskChampionships = new Set(
    [...byChampionship.entries()]
      .filter(
        ([championship, list]) =>
          list.length >= 2 &&
          CHAMPIONSHIP_RULES[championship as keyof typeof CHAMPIONSHIP_RULES].valueFormula !== 'none'
      )
      .map(([championship]) => championship)
  );
  if (atRiskChampionships.size === 0) return { reminded };

  const days = (await findUpcomingDays(db, input.seasonCode, todayIso)).filter((day) =>
    atRiskChampionships.has(day.championship)
  );
  if (days.length === 0) return { reminded };

  const riskTeams = teams.filter((team) => atRiskChampionships.has(team.championship));
  const fixtures = await findFixtures(
    db,
    riskTeams.map((t) => t.id),
    days.map((d) => d.id)
  );
  const validatedFixtures = await findValidatedFixtureIds(db, fixtures.map((f) => f.id));
  const staffByTeam = await findStaffLicences(db, riskTeams.map((t) => t.id));

  const members = await getMembersBySeason(db, input.seasonCode);
  const memberByLicence = new Map(members.map((m) => [normalizeLicence(m.licence), m]));

  for (const day of days) {
    const dayTeams = byChampionship.get(day.championship) ?? [];
    const dayFixtures = fixtures.filter((f) => f.dayId === day.id);

    const deadline = sharedDeadline(day, dayFixtures);
    const deadlineDate = deadline.value.slice(0, 10);

    // Fenêtre : rien avant la veille de la journée — qui commence un lundi — ni avant
    // la veille de l'échéance quand une rencontre est fixée plus tôt (report)…
    const windowStart = shiftIsoDate(
      deadlineDate < day.weekStart ? deadlineDate : day.weekStart,
      -1
    );
    if (todayIso < windowStart) continue;
    // …et plus rien une fois l'échéance dépassée. Sans horaire connu, la relance court
    // jusqu'au dimanche de la journée (le filtre `weekEnd >= today` du repo s'en charge).
    if (deadline.kind === 'match' && input.parisNow > deadline.value) continue;
    if (deadline.kind === 'committee' && todayIso > deadline.value) continue;

    const rules = CHAMPIONSHIP_RULES[day.championship];

    for (const team of dayTeams) {
      const teamFixtures = dayFixtures.filter((f) => f.teamId === team.id);

      // Barrages : seules les équipes que leur classement y envoie ont une rencontre —
      // pas de rencontre saisie, pas de composition à réclamer.
      if (day.kind === 'playoff' && teamFixtures.length === 0) continue;

      // Un slot est en attente si sa rencontre n'existe pas encore (le capitaine n'a
      // rien saisi — elle n'est créée qu'au premier enregistrement) ou si elle est
      // jouable sans ligne validée. Exempt (bye) ou forfait déclaré : rien à composer.
      // Barrages : on ne juge que les rencontres réellement saisies.
      const pendingSlot = (slot: number): boolean => {
        const fixture = teamFixtures.find((f) => f.slot === slot);
        if (!fixture) return true;
        return fixture.status === 'scheduled' && !validatedFixtures.has(fixture.id);
      };
      const pending =
        day.kind === 'playoff'
          ? teamFixtures.some((f) => f.status === 'scheduled' && !validatedFixtures.has(f.id))
          : Array.from({ length: rules.fixturesPerDay }, (_, i) => i + 1).some(pendingSlot);
      if (!pending) continue;

      const staff = (staffByTeam.get(team.id) ?? [])
        .map((licence) => memberByLicence.get(normalizeLicence(licence)))
        .filter((member) => member !== undefined);
      if (staff.length === 0) {
        console.log(`[push] rappel compo : ${teamName(team.number)} sans staff joignable, ignorée`);
        continue;
      }
      const emails = await getContactEmailsForMembers(db, staff.map((m) => m!.id));
      if (emails.length === 0) continue;

      const name = teamName(team.number);
      const dayLabel = day.label ?? `J${day.number}`;
      const when =
        deadline.kind === 'match'
          ? `avant la première rencontre du club, le ${frenchDate(deadlineDate)} à ${deadline.value.slice(11, 16)}`
          : deadline.kind === 'committee'
            ? `avant la journée du ${frenchDate(deadline.value)}`
            : `dès que possible — la journée démarre le ${frenchDate(day.weekStart)}`;

      const result = await enqueueNotification(
        db,
        {
          title: `${name} — ${dayLabel} : composition à valider`,
          body: `La composition de ${name} pour la ${dayLabel} (${rules.label}) n'est pas validée. Validez-la ${when}, pour permettre le contrôle des valeurs d'équipes du club.`,
          url: `/equipes/${team.id}/journee/${day.number}`,
          target: { kind: 'emails', emails },
          targetLabel: 'emails',
          targetDetail: `staff ${name}`,
          source: `teams:lineup-reminder:${team.id}:J${day.number}`,
          category: 'interclubs',
          // Une relance par jour et par équipe, même si le cron est ré-invoqué.
          skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
        },
        now
      );
      if (!result.skipped) reminded.push({ teamId: team.id, dayNumber: day.number });
    }
  }

  return { reminded };
}
