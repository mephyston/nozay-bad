import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { openPlayOpenersTable, openPlaySessionsTable } from '../../shared/open-play-schema';
import { registerToOpenPlay } from '../register-to-open-play/handler';
import { unregisterFromOpenPlay } from '../unregister-from-open-play/handler';
import { listOpenPlaySessions } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

async function seedSession(overrides: Record<string, unknown> = {}): Promise<number> {
  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
      seasonCode: '25-26',
      venueId,
      date: '2026-03-21',
      startTime: '14:00',
      endTime: '17:00',
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides
    })
    .returning();
  return session.id;
}

async function register(sessionId: number, memberId: number, guests: string[] = []) {
  return registerToOpenPlay(
    db,
    {
      sessionId,
      memberId,
      licence: `0000000${memberId}`,
      firstName: 'Camille',
      lastName: `Durand${memberId}`,
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
  venueId = venue.id;
});

describe('compteurs', () => {
  it('compte les invités dans les joueurs, pas dans les adhérents', async () => {
    const sessionId = await seedSession();
    await register(sessionId, 1, ['Léa', 'Paul']);
    await register(sessionId, 2);

    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions[0]).toMatchObject({
      registrationCount: 2,
      guestCount: 2,
      playerCount: 4
    });
  });

  it('ne laisse sortir aucun nom d’inscrit', async () => {
    const sessionId = await seedSession();
    await register(sessionId, 1, ['Léa']);

    // Lecture anonyme : l'espace adhérent obtient des compteurs, jamais des noms.
    const listed = await listOpenPlaySessions(db, {}, NOW);
    expect(JSON.stringify(listed)).not.toContain('Durand');
    expect(JSON.stringify(listed)).not.toContain('Léa');
  });

  it('rend un compteur à zéro pour une séance sans inscrit', async () => {
    await seedSession();
    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions[0]).toMatchObject({ registrationCount: 0, guestCount: 0, playerCount: 0 });
  });
});

describe('seuil et ouvreur', () => {
  it('signale « à pourvoir » dès le seuil atteint', async () => {
    const sessionId = await seedSession({ minPlayers: 4 });
    await register(sessionId, 1);
    await register(sessionId, 2);
    expect((await listOpenPlaySessions(db, {}, NOW)).sessions[0].needsOpener).toBe(false);

    await register(sessionId, 3);
    await register(sessionId, 4);
    expect((await listOpenPlaySessions(db, {}, NOW)).sessions[0].needsOpener).toBe(true);
  });

  it('atteint le seuil avec un adhérent et trois invités', async () => {
    // Ce sont bien quatre personnes qui se présenteront : le seuil compte des raquettes.
    const sessionId = await seedSession({ minPlayers: 4 });
    await register(sessionId, 1, ['Léa', 'Paul', 'Anne']);

    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions[0]).toMatchObject({ playerCount: 4, needsOpener: true });
  });

  it('redescend quand un inscrit se retire', async () => {
    const sessionId = await seedSession({ minPlayers: 4 });
    for (const memberId of [1, 2, 3, 4]) await register(sessionId, memberId);
    expect((await listOpenPlaySessions(db, {}, NOW)).sessions[0].needsOpener).toBe(true);

    // Rien n'est stocké : le compteur ne peut pas mentir, il se recalcule.
    await unregisterFromOpenPlay(db, { sessionId, memberId: 4 });
    expect((await listOpenPlaySessions(db, {}, NOW)).sessions[0].needsOpener).toBe(false);
  });

  it('ne réclame pas d’ouvreur quand il y en a un', async () => {
    const sessionId = await seedSession({
      minPlayers: 1,
      status: 'confirmed',
      openerLicence: '00000009',
      openerFirstName: 'Marie',
      openerLastName: 'Dupuis'
    });
    await register(sessionId, 1);

    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions[0].needsOpener).toBe(false);
  });

  it('ne réclame pas d’ouvreur pour une séance annulée', async () => {
    const sessionId = await seedSession({
      minPlayers: 1,
      status: 'cancelled',
      cancelledReason: 'Gymnase fermé'
    });
    await db.update(openPlaySessionsTable).set({ status: 'open' });
    await register(sessionId, 1);
    await db.update(openPlaySessionsTable).set({ status: 'cancelled' });

    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions[0].needsOpener).toBe(false);
  });
});

describe('lecture au nom d’un adhérent', () => {
  it('distingue « pas inscrit », « inscrit seul » et « inscrit accompagné »', async () => {
    const alone = await seedSession({ date: '2026-03-21' });
    const withGuests = await seedSession({ date: '2026-03-22' });
    await seedSession({ date: '2026-03-23' });

    await register(alone, 1);
    await register(withGuests, 1, ['Léa']);

    const { sessions } = await listOpenPlaySessions(db, { memberId: 1 }, NOW);
    const byDate = new Map(sessions.map((s) => [s.date, s.myGuests]));

    // Les trois cas se distinguent, et c'est ce qui décide du libellé du bouton.
    expect(byDate.get('2026-03-21')).toEqual([]);
    expect(byDate.get('2026-03-22')).toEqual([{ firstName: 'Léa', lastName: 'Martin' }]);
    expect(byDate.get('2026-03-23')).toBeNull();
  });

  it('ne rend les invités que de l’adhérent au nom duquel on lit', async () => {
    const sessionId = await seedSession();
    await register(sessionId, 1, ['Léa']);
    await register(sessionId, 2, ['Sacha']);

    const { sessions } = await listOpenPlaySessions(db, { memberId: 1 }, NOW);
    expect(sessions[0].myGuests).toEqual([{ firstName: 'Léa', lastName: 'Martin' }]);
    expect(JSON.stringify(sessions)).not.toContain('Sacha');
  });

  it('reconnaît un ouvreur désigné, et lui seul', async () => {
    await seedSession();
    await db
      .insert(openPlayOpenersTable)
      .values({ seasonCode: '25-26', licence: '00000009', createdAt: NOW });

    expect((await listOpenPlaySessions(db, { licence: '00000009' }, NOW)).canOpen).toBe(true);
    expect((await listOpenPlaySessions(db, { licence: '00000001' }, NOW)).canOpen).toBe(false);
    // Sans licence, pas de bouton : une lecture anonyme n'ouvre rien.
    expect((await listOpenPlaySessions(db, {}, NOW)).canOpen).toBe(false);
  });

  it('dit à l’ouvreur qu’il tient CETTE séance', async () => {
    const mine = await seedSession({
      date: '2026-03-21',
      status: 'confirmed',
      openerLicence: '00000009',
      openerFirstName: 'Marie',
      openerLastName: 'Dupuis'
    });
    const other = await seedSession({ date: '2026-03-22' });

    const { sessions } = await listOpenPlaySessions(db, { licence: '00000009' }, NOW);
    expect(sessions.find((s) => s.id === mine)!.iAmOpener).toBe(true);
    expect(sessions.find((s) => s.id === other)!.iAmOpener).toBe(false);
  });
});

describe('fenêtre de lecture', () => {
  it('écarte les séances passées par défaut', async () => {
    await seedSession({ date: '2026-03-07' });
    const upcoming = await seedSession({ date: '2026-03-21' });

    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions.map((s) => s.id)).toEqual([upcoming]);
  });

  it('laisse l’administration remonter l’historique', async () => {
    const past = await seedSession({ date: '2026-03-07' });
    await seedSession({ date: '2026-03-21' });

    const { sessions } = await listOpenPlaySessions(db, { from: '2000-01-01' }, NOW);
    expect(sessions.map((s) => s.id)).toContain(past);
  });

  it('garde les séances annulées visibles', async () => {
    // L'adhérent inscrit doit lire pourquoi il ne joue pas : la ligne reste, barrée.
    await seedSession({ status: 'cancelled', cancelledReason: 'Gymnase fermé' });
    const { sessions } = await listOpenPlaySessions(db, {}, NOW);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].cancelledReason).toBe('Gymnase fermé');
  });

  it('ne rend que les séances à pourvoir quand le cron le demande', async () => {
    const soon = await seedSession({ date: '2026-03-16', minPlayers: 1 });
    await seedSession({ date: '2026-03-17' }); // sous le seuil
    await seedSession({ date: '2026-04-30', minPlayers: 1 }); // hors fenêtre
    await register(soon, 1);
    const far = await seedSession({ date: '2026-04-29', minPlayers: 1 });
    await register(far, 1);

    const { sessions } = await listOpenPlaySessions(db, { needsOpenerWithinDays: 7 }, NOW);
    expect(sessions.map((s) => s.id)).toEqual([soon]);
  });
});
