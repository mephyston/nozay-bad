import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { openPlaySessionsTable } from '../../shared/open-play-schema';
import { OpenPlaySessionNotFoundError } from '../../shared/errors';
import { registerToOpenPlay } from '../register-to-open-play/handler';
import { listOpenPlayAttendees } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let sessionId: number;

async function register(memberId: number, lastName: string, guests: string[] = []) {
  return registerToOpenPlay(
    db,
    {
      sessionId,
      memberId,
      licence: `0700000${memberId}`,
      firstName: 'Camille',
      lastName,
      email: `camille${memberId}@example.org`,
      guests: guests.map((firstName) => ({ firstName, lastName: 'Martin' }))
    },
    NOW
  );
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
      venueId: venue.id,
      date: '2026-03-21',
      startTime: '14:00',
      endTime: '17:00',
      createdAt: NOW,
      updatedAt: NOW
    })
    .returning();
  sessionId = session.id;
});

describe('qui vient jouer', () => {
  it('rend les noms, et rien d’autre', async () => {
    await register(1, 'Durand');

    const { attendees } = await listOpenPlayAttendees(db, { sessionId });

    expect(attendees).toEqual([{ firstName: 'Camille', lastName: 'Durand', guests: [] }]);
    // La projection est la garde : ni licence, ni adresse, ni identifiant d'adhésion.
    const serialized = JSON.stringify(attendees);
    expect(serialized).not.toContain('example.org');
    expect(serialized).not.toContain('07000001');
    expect(serialized).not.toContain('memberId');
  });

  it('nomme les invités sous leur hôte', async () => {
    await register(1, 'Durand', ['Léa', 'Paul']);

    const { attendees, totals } = await listOpenPlayAttendees(db, { sessionId });

    expect(attendees[0].guests).toEqual([
      { firstName: 'Léa', lastName: 'Martin' },
      { firstName: 'Paul', lastName: 'Martin' }
    ]);
    expect(totals).toEqual({ members: 1, guests: 2, players: 3 });
  });

  it('trie par nom de famille : on y cherche quelqu’un', async () => {
    await register(1, 'Zeller');
    await register(2, 'Abadie');

    const { attendees } = await listOpenPlayAttendees(db, { sessionId });
    expect(attendees.map((a) => a.lastName)).toEqual(['Abadie', 'Zeller']);
  });

  it('rend une liste vide plutôt qu’une erreur quand personne ne vient', async () => {
    expect(await listOpenPlayAttendees(db, { sessionId })).toEqual({
      attendees: [],
      totals: { members: 0, guests: 0, players: 0 }
    });
  });

  it('refuse une séance inconnue', async () => {
    await expect(listOpenPlayAttendees(db, { sessionId: 9999 })).rejects.toThrow(
      OpenPlaySessionNotFoundError
    );
  });
});
