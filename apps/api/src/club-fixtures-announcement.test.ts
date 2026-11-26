import { describe, expect, it } from 'vitest';
import type { ClubFixture } from '@nba/teams-api';
import { clubFixturesMessage } from './club-fixtures-announcement';

const fixture = (teamNumber: number, date: string | null, extra: Partial<ClubFixture> = {}): ClubFixture => ({
  teamId: teamNumber, teamNumber, teamName: `Équipe ${teamNumber}`, championshipLabel: 'Mixte', championshipShortLabel: 'ICD Mixte', divisionLabel: 'D2',
  dayNumber: 3, dayLabel: null, weekStart: '2026-11-23', weekEnd: '2026-11-29', date,
  dateSource: date ? 'captain' : null, opponent: null, venue: null, ...extra
});

describe('annonce des rencontres du jour', () => {
  it("dit qui joue, contre qui, à quelle heure et où", () => {
    expect(clubFixturesMessage([fixture(1, '2026-11-27T20:30', { opponent: 'Orsay 3', venue: 'Gymnase A' })], '2026-11-27')).toEqual({
      title: "Une équipe du club joue aujourd'hui",
      body: 'Équipe 1 contre Orsay 3 à 20 h 30 (Gymnase A). Venez les encourager !'
    });
  });

  it("n'annonce que les rencontres datées de ce jour, trois au plus", () => {
    const message = clubFixturesMessage(
      [fixture(1, '2026-11-27T20:00'), fixture(2, '2026-11-27'), fixture(3, '2026-11-27T19:00'), fixture(4, '2026-11-27T21:00'), fixture(5, '2026-11-28T20:00'), fixture(6, null)],
      '2026-11-27'
    );
    expect(message?.title).toBe("4 équipes du club jouent aujourd'hui");
    expect(message?.body).toBe('Équipe 1 à 20 h · Équipe 2 · Équipe 3 à 19 h et 1 autre. Venez les encourager !');
  });

  it('se tait un jour sans rencontre', () => {
    expect(clubFixturesMessage([fixture(1, '2026-11-28T20:00'), fixture(2, null)], '2026-11-27')).toBeNull();
  });
});
