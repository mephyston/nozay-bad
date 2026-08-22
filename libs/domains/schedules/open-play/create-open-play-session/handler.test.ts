import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import {
  InvalidSessionDateError,
  InvalidSlotTimesError,
  OpenPlaySessionAlreadyExistsError,
  VenueNotFoundError
} from '../../shared/errors';
import { createOpenPlaySession } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

const SATURDAY = {
  seasonCode: '25-26',
  date: '2026-03-21',
  startTime: '14:00',
  endTime: '17:00'
};

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('création d’une séance', () => {
  it('naît ouverte, sans ouvreur, au seuil du club', async () => {
    const session = await createOpenPlaySession(db, { venueId, ...SATURDAY }, NOW);

    expect(session).toMatchObject({
      status: 'open',
      minPlayers: 4,
      openerLicence: null,
      // Créée à la main : elle ne vient d'aucun créneau récurrent.
      slotId: null
    });
  });

  it('accepte un seuil et une consigne propres à la séance', async () => {
    const session = await createOpenPlaySession(
      db,
      { venueId, ...SATURDAY, minPlayers: 6, notes: '  Badge chez Robert  ' },
      NOW
    );

    expect(session.minPlayers).toBe(6);
    expect(session.notes).toBe('Badge chez Robert');
  });

  it('rend nulle une consigne vide plutôt qu’une chaîne vide', async () => {
    const session = await createOpenPlaySession(db, { venueId, ...SATURDAY, notes: '   ' }, NOW);
    expect(session.notes).toBeNull();
  });

  it('refuse un doublon plutôt que de rendre la séance en place', async () => {
    await createOpenPlaySession(db, { venueId, ...SATURDAY }, NOW);
    // Rendre l'existante ferait croire au bureau qu'il a créé la sienne, avec les
    // horaires qu'il vient de saisir, alors qu'il regarderait ceux d'une autre.
    await expect(createOpenPlaySession(db, { venueId, ...SATURDAY }, NOW)).rejects.toThrow(
      OpenPlaySessionAlreadyExistsError
    );
  });

  it('accepte la même heure dans un autre gymnase', async () => {
    await createOpenPlaySession(db, { venueId, ...SATURDAY }, NOW);
    const [other] = await db
      .insert(venuesTable)
      .values({ code: 'la-source', name: 'La Source', createdAt: NOW })
      .returning();

    await expect(
      createOpenPlaySession(db, { venueId: other.id, ...SATURDAY }, NOW)
    ).resolves.toMatchObject({ venueId: other.id });
  });

  it('refuse un 31 février, que le format seul laisserait passer', async () => {
    await expect(
      createOpenPlaySession(db, { venueId, ...SATURDAY, date: '2026-02-31' }, NOW)
    ).rejects.toThrow(InvalidSessionDateError);
  });

  it('refuse une séance qui finit avant de commencer', async () => {
    await expect(
      createOpenPlaySession(db, { venueId, ...SATURDAY, startTime: '17:00', endTime: '14:00' }, NOW)
    ).rejects.toThrow(InvalidSlotTimesError);
  });

  it('refuse un gymnase inconnu', async () => {
    await expect(
      createOpenPlaySession(db, { venueId: 9999, ...SATURDAY }, NOW)
    ).rejects.toThrow(VenueNotFoundError);
  });

  it('accepte une séance passée : le bureau rattrape parfois son retard de saisie', async () => {
    await expect(
      createOpenPlaySession(db, { venueId, ...SATURDAY, date: '2026-03-07' }, NOW)
    ).resolves.toMatchObject({ date: '2026-03-07' });
  });
});
