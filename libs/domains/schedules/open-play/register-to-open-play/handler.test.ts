import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import {
  openPlayGuestsTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable
} from '../../shared/open-play-schema';
import {
  InvalidGuestNameError,
  OpenPlaySessionCancelledError,
  OpenPlaySessionNotFoundError,
  OpenPlaySessionPassedError,
  TooManyGuestsError
} from '../../shared/errors';
import { registerToOpenPlay } from './handler';
import { unregisterFromOpenPlay } from '../unregister-from-open-play/handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;
let sessionId: number;

const CAMILLE = {
  memberId: 1,
  licence: '00000001',
  firstName: 'Camille',
  lastName: 'Durand',
  email: 'Camille.Durand@Example.org'
};

/** Le gymnase est posé une fois pour toutes : son `code` est unique. */
async function seedSession(overrides: Record<string, unknown> = {}): Promise<number> {
  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
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

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
  sessionId = await seedSession();
});

describe('inscription à une séance de jeu libre', () => {
  it("recopie l'identité présentée et normalise l'adresse", async () => {
    const registration = await registerToOpenPlay(db, { sessionId, ...CAMILLE }, NOW);

    expect(registration).toMatchObject({
      sessionId,
      memberId: 1,
      licence: '00000001',
      firstName: 'Camille',
      lastName: 'Durand',
      // Minuscules, comme partout : c'est une clé de rapprochement, pas un affichage.
      email: 'camille.durand@example.org',
      guests: []
    });
  });

  it('élague les espaces, y compris ceux des noms d’invités', async () => {
    const registration = await registerToOpenPlay(
      db,
      {
        sessionId,
        ...CAMILLE,
        firstName: '  Camille ',
        guests: [{ firstName: ' Léa ', lastName: ' Martin ' }]
      },
      NOW
    );

    expect(registration.firstName).toBe('Camille');
    expect(registration.guests).toEqual([{ firstName: 'Léa', lastName: 'Martin' }]);
  });

  it('est idempotente : un double-clic ne compte pas deux joueurs', async () => {
    await registerToOpenPlay(db, { sessionId, ...CAMILLE }, NOW);
    await registerToOpenPlay(db, { sessionId, ...CAMILLE }, NOW);

    expect(await db.select().from(openPlayRegistrationsTable).all()).toHaveLength(1);
  });

  it('remplace la liste d’invités au lieu de l’allonger', async () => {
    await registerToOpenPlay(
      db,
      {
        sessionId,
        ...CAMILLE,
        guests: [
          { firstName: 'Léa', lastName: 'Martin' },
          { firstName: 'Paul', lastName: 'Martin' }
        ]
      },
      NOW
    );

    // Il n'existe pas d'action « ajouter un invité » : l'écran renvoie la liste entière,
    // et c'est elle qui fait foi.
    const updated = await registerToOpenPlay(
      db,
      { sessionId, ...CAMILLE, guests: [{ firstName: 'Paul', lastName: 'Martin' }] },
      NOW
    );

    expect(updated.guests).toEqual([{ firstName: 'Paul', lastName: 'Martin' }]);
    expect(await db.select().from(openPlayRegistrationsTable).all()).toHaveLength(1);
    expect(await db.select().from(openPlayGuestsTable).all()).toHaveLength(1);
  });

  it('accepte de retirer tous ses invités', async () => {
    await registerToOpenPlay(
      db,
      { sessionId, ...CAMILLE, guests: [{ firstName: 'Léa', lastName: 'Martin' }] },
      NOW
    );
    const alone = await registerToOpenPlay(db, { sessionId, ...CAMILLE, guests: [] }, NOW);

    expect(alone.guests).toEqual([]);
    expect(await db.select().from(openPlayGuestsTable).all()).toEqual([]);
  });

  it('rattache correctement TROIS invités, id de tables décalés', async () => {
    // Le piège de l'ADR-0005 § 2.2 : `last_insert_rowid()` désigne la dernière ligne
    // insérée toutes tables confondues, donc le deuxième invité référencerait le
    // premier. Sur une base neuve les deux séquences d'id coïncident et masquent le
    // défaut — on les décale d'abord, exactement comme le fait `create-invoice`.
    const otherSession = await seedOtherSession();
    for (const memberId of [10, 11, 12, 13, 14]) {
      await registerToOpenPlay(
        db,
        { sessionId: otherSession, ...CAMILLE, memberId, licence: `0000001${memberId}` },
        NOW
      );
    }

    const registration = await registerToOpenPlay(
      db,
      {
        sessionId,
        ...CAMILLE,
        guests: [
          { firstName: 'Léa', lastName: 'Martin' },
          { firstName: 'Paul', lastName: 'Martin' },
          { firstName: 'Anne', lastName: 'Martin' }
        ]
      },
      NOW
    );

    expect(registration.guests).toHaveLength(3);
    expect(registration.guests.map((g) => g.firstName).sort()).toEqual(['Anne', 'Léa', 'Paul']);
  });

  async function seedOtherSession(): Promise<number> {
    return seedSession({ date: '2026-03-22', startTime: '10:00', endTime: '12:00' });
  }
});

describe('refus, dans l’ordre', () => {
  it('refuse une séance inconnue', async () => {
    await expect(registerToOpenPlay(db, { sessionId: 9999, ...CAMILLE }, NOW)).rejects.toThrow(
      OpenPlaySessionNotFoundError
    );
  });

  it('refuse une séance annulée', async () => {
    const cancelled = await seedSession({
      date: '2026-03-28',
      status: 'cancelled',
      cancelledReason: 'Gymnase fermé'
    });
    await expect(
      registerToOpenPlay(db, { sessionId: cancelled, ...CAMILLE }, NOW)
    ).rejects.toThrow(OpenPlaySessionCancelledError);
  });

  it('refuse une séance passée', async () => {
    const past = await seedSession({ date: '2026-03-07' });
    await expect(registerToOpenPlay(db, { sessionId: past, ...CAMILLE }, NOW)).rejects.toThrow(
      OpenPlaySessionPassedError
    );
  });

  it('laisse la séance du jour ouverte jusqu’à minuit', async () => {
    const today = await seedSession({ date: '2026-03-14', startTime: '09:00', endTime: '12:00' });
    // Il est 10 h, la séance a commencé à 9 h : l'adhérent qui arrive doit pouvoir se
    // compter, c'est même à ce moment-là que le compte importe le plus.
    await expect(
      registerToOpenPlay(db, { sessionId: today, ...CAMILLE }, NOW)
    ).resolves.toMatchObject({ memberId: 1 });
  });

  it('refuse un invité dont le nom est vide', async () => {
    await expect(
      registerToOpenPlay(
        db,
        { sessionId, ...CAMILLE, guests: [{ firstName: 'Léa', lastName: '  ' }] },
        NOW
      )
    ).rejects.toThrow(InvalidGuestNameError);
    expect(await db.select().from(openPlayRegistrationsTable).all()).toEqual([]);
  });

  it('refuse un quatrième invité', async () => {
    const guests = ['Léa', 'Paul', 'Anne', 'Marc'].map((firstName) => ({
      firstName,
      lastName: 'Martin'
    }));
    await expect(
      registerToOpenPlay(db, { sessionId, ...CAMILLE, guests }, NOW)
    ).rejects.toThrow(TooManyGuestsError);
  });
});

describe('désinscription', () => {
  it('retire l’inscription et ses invités', async () => {
    await registerToOpenPlay(
      db,
      { sessionId, ...CAMILLE, guests: [{ firstName: 'Léa', lastName: 'Martin' }] },
      NOW
    );

    expect(await unregisterFromOpenPlay(db, { sessionId, memberId: 1 })).toEqual({ removed: true });
    expect(await db.select().from(openPlayRegistrationsTable).all()).toEqual([]);
    expect(await db.select().from(openPlayGuestsTable).all()).toEqual([]);
  });

  it('ne se plaint pas d’une désinscription sans inscription', async () => {
    // L'appelant demande un état — « je ne viens pas » — et cet état est atteint.
    expect(await unregisterFromOpenPlay(db, { sessionId, memberId: 1 })).toEqual({ removed: false });
  });

  it('reste possible sur une séance annulée', async () => {
    const cancelled = await seedSession({
      date: '2026-03-28',
      status: 'cancelled',
      cancelledReason: 'Gymnase fermé'
    });
    await db.insert(openPlayRegistrationsTable).values({
      sessionId: cancelled,
      memberId: 1,
      licence: '00000001',
      firstName: 'Camille',
      lastName: 'Durand',
      email: 'camille@example.org',
      createdAt: NOW,
      updatedAt: NOW
    });

    // Se retirer d'une liste devenue sans objet est légitime, et c'est ce que l'ouvreur
    // a besoin de savoir si la séance est finalement rouverte.
    expect(await unregisterFromOpenPlay(db, { sessionId: cancelled, memberId: 1 })).toEqual({
      removed: true
    });
  });

  it('refuse une séance inconnue', async () => {
    await expect(unregisterFromOpenPlay(db, { sessionId: 9999, memberId: 1 })).rejects.toThrow(
      OpenPlaySessionNotFoundError
    );
  });
});
