import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { memberClubFunctionsTable } from '@nba/members/schema';
import { openPlaySessionsTable, openPlayRegistrationsTable, venuesTable } from '@nba/schedules/schema';
import { pushMessagesTable } from '@nba/notifications/schema';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { OPEN_PLAY_BOARD_ALERT_SOURCE, sendOpenPlayBoardAlert } from './open-play-board-alert';

/**
 * L'alerte au bureau, la veille d'une séance que personne ne s'est engagé à ouvrir
 * (RF-SCH-005). Ces tests portent sur le croisement : quelles séances, à qui, combien de fois.
 */

const NOW = new Date('2026-03-14T07:00:00.000Z');
const TODAY = '2026-03-14';
const TOMORROW = '2026-03-15';

let db: any;
let season: any;
let venueId: number;

const alerts = async () =>
  (await db.select().from(pushMessagesTable).all()).filter((m: any) => m.source === OPEN_PLAY_BOARD_ALERT_SOURCE);

async function seedSession(date: string, opts: { players?: number; opener?: string; status?: 'open' | 'cancelled'; startTime?: string } = {}) {
  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
      seasonCode: '25-26',
      venueId,
      date,
      startTime: opts.startTime ?? '14:00',
      endTime: '22:00',
      minPlayers: 4,
      status: opts.status ?? 'open',
      openerLicence: opts.opener ?? null,
      openerName: opts.opener ? 'Marie Dupuis' : null,
      createdAt: NOW,
      updatedAt: NOW
    })
    .returning();
  for (let i = 0; i < (opts.players ?? 0); i++) {
    await db.insert(openPlayRegistrationsTable).values({
      sessionId: session.id,
      memberId: 100 + i,
      licence: `1000000${i}`,
      firstName: 'Joueur',
      lastName: `N${i}`,
      email: `joueur${i}@example.org`,
      createdAt: NOW,
      updatedAt: NOW
    });
  }
}

async function seedBoardMember() {
  await insertMemberFixture(db, {
    licence: '07000001',
    seasonId: season.id,
    firstName: 'Paul',
    lastName: 'Martin',
    email: 'paul@example.org',
    importedAt: NOW
  });
  await db.insert(memberClubFunctionsTable).values({
    seasonId: season.id, licence: '07000001', function: 'president', createdAt: NOW
  });
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
  season = await db
    .insert(seasonsTable)
    .values({ code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: NOW })
    .returning()
    .get();
  const [venue] = await db.insert(venuesTable).values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW }).returning();
  venueId = venue.id;
});

describe('alerte au bureau : séance sans bénévole', () => {
  it('prévient les fonctions du club d’une séance de demain sans bénévole, même sous le seuil', async () => {
    await seedSession(TOMORROW, { players: 1 });
    await seedBoardMember();

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);

    const messages = await alerts();
    expect(messages).toHaveLength(1);
    expect(messages[0].category).toBe('open_play');
    expect(messages[0].url).toBe('/jeu-libre');
    expect(messages[0].body).toContain('14:00 à Pierre Dupuis');
  });

  it('ne dit rien d’une séance qu’un bénévole s’est engagé à ouvrir', async () => {
    await seedSession(TOMORROW, { opener: '07000009' });
    await seedBoardMember();

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);
    expect(await alerts()).toHaveLength(0);
  });

  it('ne dit rien d’une séance annulée', async () => {
    await seedSession(TOMORROW, { status: 'cancelled' });
    await seedBoardMember();

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);
    expect(await alerts()).toHaveLength(0);
  });

  it('ne regarde que le lendemain', async () => {
    await seedSession(TODAY);
    await seedSession('2026-03-16');
    await seedBoardMember();

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);
    expect(await alerts()).toHaveLength(0);
  });

  it('n’envoie rien sans fonction du club renseignée', async () => {
    await seedSession(TOMORROW);

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);
    expect(await alerts()).toHaveLength(0);
  });

  it('un seul message pour plusieurs séances, et pas de doublon si le cron rejoue', async () => {
    await seedSession(TOMORROW);
    await seedSession(TOMORROW, { startTime: '19:00' });
    await seedBoardMember();

    await sendOpenPlayBoardAlert(db, season, NOW, TODAY);
    await sendOpenPlayBoardAlert(db, season, new Date(NOW.getTime() + 60_000), TODAY);

    const messages = await alerts();
    expect(messages).toHaveLength(1);
    expect(messages[0].title).toBe('Demain : séances sans bénévole');
  });
});
