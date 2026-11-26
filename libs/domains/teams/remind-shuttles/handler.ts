import { type Db } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { enqueueNotification } from '@nba/notifications-api';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIP_RULES, teamName, type Championship } from '../shared/championship';
import { normalizeLicence } from '../shared/ranking';
import { shiftIsoDate } from '../shared/ranking-resolution';
import { publishedChampionships } from '../shared/rosters-publication';
import { staffContacts } from '../shared/staff-contacts';
import { RemindShuttlesRepository } from './repository';
import type { RemindShuttlesInput, RemindShuttlesOutput } from './dto';

/**
 * Le rappel part le jeudi, au début de l'entraînement : là où le capitaine peut récupérer
 * les boîtes. Il couvre les rencontres des trois jours suivants — le dimanche, ou le samedi
 * par dérogation (art. 3.3.1).
 */
export const SHUTTLES_REMINDER = { weekday: 'THU', time: '19:30', daysAhead: 3 } as const;

/** L'heure du rappel est-elle venue ? Le créneau court jusqu'à la fin de l'heure : un passage manqué se rattrape. */
export function isShuttlesReminderDue(clock: { weekday: string; dateTime: string; hour: number }): boolean {
  return clock.weekday === SHUTTLES_REMINDER.weekday && clock.dateTime.slice(11, 16) >= SHUTTLES_REMINDER.time && clock.hour === Number(SHUTTLES_REMINDER.time.slice(0, 2));
}

const repo = new RemindShuttlesRepository();

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function frenchDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/**
 * Rappelle au capitaine et au vice-capitaine d'une équipe dont le championnat le demande
 * (`shuttlesReminder`, les vétérans) de récupérer les boîtes de volants pour la journée.
 *
 * Pour les rencontres des trois jours qui suivent `today`, une fois : c'est la date de la
 * rencontre qui compte (celle du capitaine, sinon le jour commun du comité). Sans date, rien
 * ne part — on ne saurait pas si elle tombe ce week-end. Une équipe au repos ou déclarée forfait ne joue pas. Seuls les championnats
 * aux effectifs publiés ont un staff aux yeux des adhérents.
 */
export async function remindShuttles(db: Db, input: RemindShuttlesInput, now: Date = new Date()): Promise<RemindShuttlesOutput> {
  const reminded: RemindShuttlesOutput['reminded'] = [];
  const published = await publishedChampionships(db, input.seasonCode);
  const championships = (Object.keys(CHAMPIONSHIP_RULES) as Championship[]).filter(
    (code) => CHAMPIONSHIP_RULES[code].shuttlesReminder && published.has(code)
  );
  const teams = await repo.teams(db, input.seasonCode, championships);
  if (teams.length === 0) return { reminded };

  const first = shiftIsoDate(input.today, 1);
  const last = shiftIsoDate(input.today, SHUTTLES_REMINDER.daysAhead);
  const days = await repo.days(db, input.seasonCode, championships);
  const fixtures = await repo.fixtures(db, teams.map((t) => t.id), days.map((d) => d.id));
  const due = teams.flatMap((team) =>
    days
      .filter((day) => day.championship === team.championship)
      .flatMap((day) => {
        // Une journée peut compter deux rencontres (vétérans) : un seul rappel, pour la
        // première qui se joue. Un rang exempt ou forfait ne compte pas ; un rang encore
        // sans rencontre saisie suit le jour commun du comité.
        const ranks = Array.from({ length: CHAMPIONSHIP_RULES[team.championship].fixturesPerDay }, (_, i) => i + 1);
        const dates = ranks
          .map((rank) => fixtures.find((f) => f.teamId === team.id && f.dayId === day.id && f.slot === rank) ?? null)
          .filter((fixture) => !fixture || fixture.status === 'scheduled')
          .map((fixture) => (fixture?.playedAt ?? day.matchDate ?? '').slice(0, 10))
          .filter((date) => date >= first && date <= last)
          .sort();
        return dates.length > 0 ? [{ team, day, matchDay: dates[0] }] : [];
      })
  );
  if (due.length === 0) return { reminded };

  const [{ teamPrefix }, staffByTeam, members] = await Promise.all([
    getClubSettings(db),
    repo.staff(db, due.map(({ team }) => team.id)),
    getMembersBySeason(db, input.seasonCode)
  ]);
  const byLicence = new Map(members.map((m) => [normalizeLicence(m.licence), m]));

  for (const { team, day, matchDay } of due) {
    const name = teamName(teamPrefix, team.number);
    const { emails } = staffContacts(byLicence, staffByTeam.get(team.id) ?? []);
    if (emails.length === 0) {
      console.log(`[push] volants : ${name} sans capitaine joignable, ignorée`);
      continue;
    }
    const dayLabel = day.label ?? `J${day.number}`;
    const result = await enqueueNotification(
      db,
      {
        title: `${name} — ${dayLabel} : volants à prévoir`,
        body: `Rencontre de ${frenchDay(matchDay)} (${CHAMPIONSHIP_RULES[team.championship].label}) : pensez à récupérer les boîtes de volants pour la journée.`,
        url: `/equipes/${team.id}/journee/${day.number}`,
        target: { kind: 'emails', emails },
        targetLabel: 'emails',
        targetDetail: `staff ${name}`,
        source: `teams:shuttles-reminder:${team.id}:J${day.number}`,
        category: 'interclubs',
        // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
        skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
      },
      now
    );
    if (!result.skipped) reminded.push({ teamId: team.id, dayNumber: day.number });
  }
  return { reminded };
}
