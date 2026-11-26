import { type createDb } from '@nba/db';
import { type SeasonRow } from '@nba/accounting-api';
import { listClubFixtures, type ClubFixture } from '@nba/teams-api';
import { enqueueNotification } from '@nba/notifications-api';

/** Origine du message, reprise par le registre des envois programmés. */
export const CLUB_FIXTURES_SOURCE = 'teams:club-fixtures-daily';

/** « 20 h », « 20 h 30 » ; rien pour une date sans heure. */
function hour(date: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(date);
  if (!m) return '';
  return ` à ${Number(m[1])} h${m[2] === '00' ? '' : ` ${m[2]}`}`;
}

/**
 * Le message du matin d'un jour de match : les rencontres **datées** de ce jour. Une
 * rencontre dont seule la semaine est connue ne s'annonce pas : on ne sait pas si c'est
 * aujourd'hui. Trois rencontres au plus dans le corps, un écran verrouillé n'en lit pas plus.
 */
export function clubFixturesMessage(fixtures: ClubFixture[], clubToday: string): { title: string; body: string } | null {
  const today = fixtures.filter((f) => f.date?.slice(0, 10) === clubToday);
  if (today.length === 0) return null;
  const lines = today
    .slice(0, 3)
    .map((f) => `${f.teamName}${f.opponent ? ` contre ${f.opponent}` : ''}${hour(f.date!)}${f.venue ? ` (${f.venue})` : ''}`);
  const more = today.length > 3 ? ` et ${today.length - 3} autre${today.length - 3 > 1 ? 's' : ''}` : '';
  return {
    title: today.length > 1 ? `${today.length} équipes du club jouent aujourd'hui` : "Une équipe du club joue aujourd'hui",
    body: `${lines.join(' · ')}${more}. Venez les encourager !`
  };
}

/**
 * Annonce au club, le matin, les rencontres du jour de toutes les équipes.
 *
 * Même montage que les autres envois programmés : le domaine des équipes ne connaît pas
 * les notifications, la composition se fait ici. Chacun s'en désabonne par la catégorie
 * « Rencontres du club » ; un joueur reçoit donc aussi la ligne de sa propre équipe.
 */
export async function sendClubFixturesAnnouncement(
  db: ReturnType<typeof createDb>,
  season: SeasonRow,
  now: Date,
  clubToday: string
): Promise<void> {
  const { fixtures } = await listClubFixtures(db, { seasonCode: season.code, from: clubToday, to: clubToday }, now);
  const message = clubFixturesMessage(fixtures, clubToday);
  if (!message) return;

  const result = await enqueueNotification(
    db,
    {
      ...message,
      url: '/agenda?vue=interclubs',
      target: { kind: 'all' },
      source: CLUB_FIXTURES_SOURCE,
      category: 'club_fixtures',
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
    },
    now
  );
  if (!result.skipped) console.log(`[push] rencontres du club : ${result.queued} appareil(s) en file`);
}
