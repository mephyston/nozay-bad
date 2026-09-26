import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { openPlaySessionsTable } from '../../shared/open-play-schema';
import { registerToOpenPlay } from '../register-to-open-play/handler';
import { listPublicOpenPlay } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

async function session(values: Partial<typeof openPlaySessionsTable.$inferInsert> = {}) {
  const [row] = await db
    .insert(openPlaySessionsTable)
    .values({
      venueId,
      date: '2026-03-21',
      startTime: '14:00',
      endTime: '17:00',
      createdAt: NOW,
      updatedAt: NOW,
      ...values
    })
    .returning();
  return row;
}

async function register(sessionId: number, memberId: number, firstName: string, lastName: string, guests: string[] = []) {
  return registerToOpenPlay(
    db,
    {
      sessionId,
      memberId,
      licence: `0700000${memberId}`,
      firstName,
      lastName,
      email: `membre${memberId}@example.org`,
      guests: guests.map((guest) => ({ firstName: guest, lastName: 'Invité' }))
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
  venueId = venue.id;
});

describe('le jeu libre, tel que le site public le montre', () => {
  it('nomme les inscrits en « Prénom I. », et rien de plus', async () => {
    const { id } = await session();
    await register(id, 1, 'Camille', 'Durand');
    await register(id, 2, 'Léo', 'martin');

    const { sessions } = await listPublicOpenPlay(db, {}, NOW);

    expect(sessions[0].players).toEqual(['Camille D.', 'Léo M.']);
    // La réduction se fait ici : ni nom complet, ni licence, ni adresse ne sortent.
    const serialized = JSON.stringify(sessions);
    expect(serialized).not.toContain('Durand');
    expect(serialized).not.toContain('example.org');
    expect(serialized).not.toContain('07000001');
  });

  it('compte les invités sans jamais les nommer', async () => {
    const { id } = await session();
    await register(id, 1, 'Camille', 'Durand', ['Paul', 'Zoé']);

    const [first] = (await listPublicOpenPlay(db, {}, NOW)).sessions;

    expect(first.guestCount).toBe(2);
    expect(first.playerCount).toBe(3);
    expect(JSON.stringify(first)).not.toContain('Paul');
  });

  it("montre l'ouvreur quand il est identifié, `null` sinon", async () => {
    await session({
      date: '2026-03-21',
      status: 'confirmed',
      openerLicence: '07000009',
      openerFirstName: 'Robert',
      openerLastName: 'Moreau'
    });
    await session({ date: '2026-03-22' });

    const { sessions } = await listPublicOpenPlay(db, {}, NOW);

    expect(sessions.map((s) => s.opener)).toEqual(['Robert M.', null]);
    expect(JSON.stringify(sessions)).not.toContain('07000009');
  });

  it("ne livre ni consigne du bureau ni motif d'annulation", async () => {
    await session({ notes: 'Clé chez Robert', status: 'cancelled', cancelledReason: 'Gymnase fermé' });

    const [first] = (await listPublicOpenPlay(db, {}, NOW)).sessions;

    expect(first.status).toBe('cancelled');
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('Robert');
    expect(serialized).not.toContain('Gymnase fermé');
  });

  it("s'arrête au dernier jour demandé, bornes comprises", async () => {
    await session({ date: '2026-03-15' });
    await session({ date: '2026-03-22' });
    await session({ date: '2026-03-23' });

    const { sessions } = await listPublicOpenPlay(db, { to: '2026-03-22', limit: 60 }, NOW);

    expect(sessions.map((s) => s.date)).toEqual(['2026-03-15', '2026-03-22']);
  });

  it('ignore une borne qui n’est pas une date', async () => {
    await session({ date: '2026-03-15' });

    const { sessions } = await listPublicOpenPlay(db, { to: '2026-02-31' }, NOW);

    expect(sessions).toHaveLength(1);
  });

  it("écarte les séances passées, garde celle du jour, et s'en tient à la limite", async () => {
    await session({ date: '2026-03-13' });
    await session({ date: '2026-03-14' });
    await session({ date: '2026-03-15' });
    await session({ date: '2026-03-16' });

    const { sessions } = await listPublicOpenPlay(db, { limit: 2 }, NOW);

    expect(sessions.map((s) => s.date)).toEqual(['2026-03-14', '2026-03-15']);
    expect(sessions[0].venueName).toBe('Pierre Dupuis');
  });
});
