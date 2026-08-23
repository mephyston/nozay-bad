import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { venuesTable } from '@nba/schedules/schema';
import { pushMessagesTable } from '@nba/notifications/schema';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { sendOpenPlayOpenerReminders } from './scheduled';

/**
 * L'appel du matin aux ouvreurs.
 *
 * La composition vit ici parce que le domaine des créneaux est feuille : il ne sait
 * résoudre ni une adresse ni un envoi. Ces tests portent donc sur le croisement — quelles
 * séances méritent l'appel, à qui, et combien de fois.
 */

const NOW = new Date('2026-03-14T07:00:00.000Z');
const TODAY = '2026-03-14';

let db: any;
let season: any;
let venueId: number;

const reminders = async () =>
  (await db.select().from(pushMessagesTable).all()).filter(
    (m: any) => m.source === 'schedules:open-play-opener-reminder'
  );

/** Une séance, et assez de joueurs pour qu'elle réclame un ouvreur. */
async function seedSessionNeedingOpener(date: string, players = 4) {
  const { openPlayRegistrationsTable, openPlaySessionsTable } = await import(
    '@nba/schedules/schema'
  );
  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
      seasonCode: '25-26',
      venueId,
      date,
      startTime: '14:00',
      endTime: '17:00',
      minPlayers: 4,
      createdAt: NOW,
      updatedAt: NOW
    })
    .returning();

  for (let i = 0; i < players; i++) {
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
  return session.id;
}

async function seedOpener(licence: string, email: string) {
  const { openPlayOpenersTable } = await import('@nba/schedules/schema');
  await insertMemberFixture(db, {
    licence,
    seasonId: season.id,
    firstName: 'Marie',
    lastName: 'Dupuis',
    email,
    importedAt: NOW
  });
  await db.insert(openPlayOpenersTable).values({ seasonCode: '25-26', licence, createdAt: NOW });
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
  season = await db
    .insert(seasonsTable)
    .values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: NOW
    })
    .returning()
    .get();
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('appel aux ouvreurs', () => {
  it('prévient les ouvreurs désignés d’une séance à pourvoir', async () => {
    await seedSessionNeedingOpener('2026-03-21');
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);

    const messages = await reminders();
    expect(messages).toHaveLength(1);
    expect(messages[0].category).toBe('open_play');
    expect(messages[0].url).toBe('/jeu-libre');
    expect(messages[0].body).toContain('2026-03-21');
  });

  it('n’envoie rien quand aucune séance n’a atteint son seuil', async () => {
    await seedSessionNeedingOpener('2026-03-21', 2);
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);
    expect(await reminders()).toHaveLength(0);
  });

  it('n’envoie rien quand personne n’a de badge', async () => {
    await seedSessionNeedingOpener('2026-03-21');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);
    expect(await reminders()).toHaveLength(0);
  });

  it('ignore une séance au-delà de la semaine', async () => {
    // Au-delà, l'alerte partirait sur des séances qui trouveront preneur d'elles-mêmes.
    await seedSessionNeedingOpener('2026-04-30');
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);
    expect(await reminders()).toHaveLength(0);
  });

  it('n’envoie qu’un seul message pour plusieurs séances', async () => {
    // Trois notifications à sept heures du matin font désinstaller l'application.
    await seedSessionNeedingOpener('2026-03-16');
    await seedSessionNeedingOpener('2026-03-18');
    await seedSessionNeedingOpener('2026-03-20');
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);

    const messages = await reminders();
    expect(messages).toHaveLength(1);
    expect(messages[0].title).toContain('Créneaux');
    expect(messages[0].body).toContain('3 séances');
  });

  it('ne double pas l’envoi quand le cron est ré-invoqué', async () => {
    await seedSessionNeedingOpener('2026-03-21');
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);
    await sendOpenPlayOpenerReminders(db, season, new Date(NOW.getTime() + 60_000), TODAY);

    expect(await reminders()).toHaveLength(1);
  });

  it('n’appelle pas pour une séance déjà pourvue', async () => {
    const { openPlaySessionsTable } = await import('@nba/schedules/schema');
    const sessionId = await seedSessionNeedingOpener('2026-03-21');
    await db
      .update(openPlaySessionsTable)
      .set({ status: 'confirmed', openerLicence: '07000009', openerFirstName: 'Marie' });
    await seedOpener('07000009', 'marie@example.org');

    await sendOpenPlayOpenerReminders(db, season, NOW, TODAY);
    expect(await reminders()).toHaveLength(0);
    expect(sessionId).toBeGreaterThan(0);
  });
});
