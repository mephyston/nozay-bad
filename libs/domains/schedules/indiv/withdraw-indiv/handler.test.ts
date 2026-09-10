import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import { IndivSessionNotFoundError } from '../../shared/errors';
import { createIndivSession } from '../create-indiv-session/handler';
import { requestIndiv } from '../request-indiv/handler';
import { withdrawIndiv } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');
const CAMILLE = { memberId: 7, licence: '07051876', firstName: 'Camille', lastName: 'Durand', email: 'c@example.org', memberGroup: 'Compétiteurs adultes' };

let db: Db;
let sessionId: number;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  sessionId = (await createIndivSession(db, { venueId: venue.id, date: '2026-03-17', startTime: '19:30' }, NOW)).id;
});

describe('retrait', () => {
  it('retire la candidature, même après l’annonce, et tolère l’absence', async () => {
    await requestIndiv(db, { sessionId, ...CAMILLE }, NOW);
    await db.update(indivSessionsTable).set({ status: 'announced', announcedAt: NOW });

    expect(await withdrawIndiv(db, { sessionId, memberId: 7 })).toEqual({ removed: true });
    expect(await db.select().from(indivRequestsTable).all()).toHaveLength(0);
    expect(await withdrawIndiv(db, { sessionId, memberId: 7 })).toEqual({ removed: false });
  });

  it('refuse seulement une soirée inconnue', async () => {
    await expect(withdrawIndiv(db, { sessionId: 999, memberId: 7 })).rejects.toThrow(IndivSessionNotFoundError);
  });
});
