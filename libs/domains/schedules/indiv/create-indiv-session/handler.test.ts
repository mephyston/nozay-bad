import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import {
  IndivSessionAlreadyExistsError,
  InvalidIndivLayoutError,
  InvalidSessionDateError,
  VenueNotFoundError
} from '../../shared/errors';
import { createIndivSession } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');
const TUESDAY = { date: '2026-03-17', startTime: '19:30' };

let db: Db;
let venueId: number;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('création d’une soirée d’indiv', () => {
  it('naît ouverte, à l’habitude du club, sans créneau d’origine', async () => {
    const session = await createIndivSession(db, { venueId, ...TUESDAY }, NOW);
    expect(session).toMatchObject({
      status: 'open',
      slotCount: 2,
      slotMinutes: 30,
      capacityPerSlot: 2,
      slotId: null,
      announcedAt: null
    });
  });

  it('accepte des réglages propres à la soirée', async () => {
    const session = await createIndivSession(
      db,
      { venueId, ...TUESDAY, slotCount: 3, slotMinutes: 20, capacityPerSlot: 1, notes: '  Terrain 4  ' },
      NOW
    );
    expect(session).toMatchObject({ slotCount: 3, slotMinutes: 20, capacityPerSlot: 1, notes: 'Terrain 4' });
  });

  it('range un libellé et une consigne à null comme absents', async () => {
    const session = await createIndivSession(db, { venueId, ...TUESDAY, label: null, notes: null }, NOW);
    expect(session).toMatchObject({ label: null, notes: null });
  });

  it('refuse un doublon plutôt que de rendre la soirée en place', async () => {
    await createIndivSession(db, { venueId, ...TUESDAY }, NOW);
    await expect(createIndivSession(db, { venueId, ...TUESDAY }, NOW)).rejects.toThrow(
      IndivSessionAlreadyExistsError
    );
  });

  it('refuse le 31 février, un gymnase inconnu et une soirée qui franchit minuit', async () => {
    await expect(
      createIndivSession(db, { venueId, date: '2026-02-31', startTime: '19:30' }, NOW)
    ).rejects.toThrow(InvalidSessionDateError);
    await expect(createIndivSession(db, { venueId: 999, ...TUESDAY }, NOW)).rejects.toThrow(
      VenueNotFoundError
    );
    await expect(
      createIndivSession(db, { venueId, date: '2026-03-17', startTime: '23:30' }, NOW)
    ).rejects.toThrow(InvalidIndivLayoutError);
  });
});
