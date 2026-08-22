import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { openPlaySessionsTable } from '../../shared/open-play-schema';
import {
  NotAnOpenerError,
  NotTheOpenerError,
  OpenPlaySessionCancelledError,
  OpenPlaySessionNotFoundError,
  OpenPlaySessionPassedError,
  SessionAlreadyClaimedError
} from '../../shared/errors';
import { saveOpenPlayOpener } from '../save-open-play-opener/handler';
import { deleteOpenPlayOpener } from '../delete-open-play-opener/handler';
import { listOpenPlayOpeners } from '../list-open-play-openers/handler';
import { registerToOpenPlay } from '../register-to-open-play/handler';
import { listOpenPlayRegistrations } from '../list-open-play-registrations/handler';
import { claimOpenPlaySession } from './handler';
import { releaseOpenPlaySession } from '../release-open-play-session/handler';

const NOW = new Date('2026-03-14T10:00:00Z');
const MARIE = { licence: '00000009', firstName: 'Marie', lastName: 'Dupuis' };
const PIERRE = { licence: '00000010', firstName: 'Pierre', lastName: 'Leroy' };

let db: Db;
let venueId: number;
let sessionId: number;

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

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
  sessionId = await seedSession();
  await saveOpenPlayOpener(db, { seasonCode: '25-26', licence: MARIE.licence }, NOW);
  await saveOpenPlayOpener(db, { seasonCode: '25-26', licence: PIERRE.licence }, NOW);
});

describe('prendre une séance', () => {
  it('confirme la séance et recopie le nom de l’ouvreur', async () => {
    const claimed = await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);

    expect(claimed).toMatchObject({
      status: 'confirmed',
      openerLicence: '00000009',
      openerFirstName: 'Marie',
      openerLastName: 'Dupuis'
    });
    expect(claimed.openedAt).not.toBeNull();
  });

  it('refuse un adhérent qui n’est pas de la liste', async () => {
    // Le test qui protège toute la fonctionnalité : le refus est rendu par le handler,
    // pas par l'écran, donc une requête forgée se fait refuser tout de même.
    await expect(
      claimOpenPlaySession(db, { sessionId, licence: '00000001', firstName: 'X', lastName: 'Y' }, NOW)
    ).rejects.toThrow(NotAnOpenerError);
  });

  it('refuse une séance déjà prise par un autre', async () => {
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    await expect(claimOpenPlaySession(db, { sessionId, ...PIERRE }, NOW)).rejects.toThrow(
      SessionAlreadyClaimedError
    );
  });

  it('est idempotente pour celui qui la tient déjà', async () => {
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    await expect(claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW)).resolves.toMatchObject({
      openerLicence: '00000009'
    });
  });

  it('refuse une séance inconnue, annulée ou passée', async () => {
    await expect(claimOpenPlaySession(db, { sessionId: 9999, ...MARIE }, NOW)).rejects.toThrow(
      OpenPlaySessionNotFoundError
    );

    const cancelled = await seedSession({
      date: '2026-03-28',
      status: 'cancelled',
      cancelledReason: 'Gymnase fermé'
    });
    await expect(claimOpenPlaySession(db, { sessionId: cancelled, ...MARIE }, NOW)).rejects.toThrow(
      OpenPlaySessionCancelledError
    );

    const past = await seedSession({ date: '2026-03-07' });
    await expect(claimOpenPlaySession(db, { sessionId: past, ...MARIE }, NOW)).rejects.toThrow(
      OpenPlaySessionPassedError
    );
  });
});

describe('rendre une séance', () => {
  it('la rouvre sans toucher aux inscrits', async () => {
    await registerToOpenPlay(
      db,
      {
        sessionId,
        memberId: 1,
        licence: '00000001',
        firstName: 'Camille',
        lastName: 'Durand',
        email: 'camille@example.org',
        guests: [{ firstName: 'Léa', lastName: 'Martin' }]
      },
      NOW
    );
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);

    const released = await releaseOpenPlaySession(db, { sessionId, licence: MARIE.licence }, NOW);

    expect(released).toMatchObject({
      status: 'open',
      openerLicence: null,
      openerFirstName: null,
      openedAt: null
    });
    // Les inscrits n'ont rien fait de mal.
    const { totals } = await listOpenPlayRegistrations(db, { sessionId });
    expect(totals.players).toBe(2);
  });

  it('refuse de libérer la séance d’un autre', async () => {
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    await expect(
      releaseOpenPlaySession(db, { sessionId, licence: PIERRE.licence }, NOW)
    ).rejects.toThrow(NotTheOpenerError);
  });

  it('refuse de se rétracter après la séance', async () => {
    // Effacer la trace de qui a réellement ouvert le gymnase n'aurait pas de sens.
    const past = await seedSession({ date: '2026-03-07', status: 'confirmed', openerLicence: MARIE.licence });
    await expect(
      releaseOpenPlaySession(db, { sessionId: past, licence: MARIE.licence }, NOW)
    ).rejects.toThrow(OpenPlaySessionPassedError);
  });
});

describe('liste des ouvreurs', () => {
  it('désigner deux fois n’est pas une erreur', async () => {
    await saveOpenPlayOpener(db, { seasonCode: '25-26', licence: MARIE.licence }, NOW);
    expect(await listOpenPlayOpeners(db, { seasonCode: '25-26' })).toHaveLength(2);
  });

  it('compte les séances ouvertes par chacun', async () => {
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    const second = await seedSession({ date: '2026-03-28' });
    await claimOpenPlaySession(db, { sessionId: second, ...MARIE }, NOW);

    const openers = await listOpenPlayOpeners(db, { seasonCode: '25-26' });
    expect(openers.find((o) => o.licence === MARIE.licence)?.sessionsOpened).toBe(2);
    expect(openers.find((o) => o.licence === PIERRE.licence)?.sessionsOpened).toBe(0);
  });

  it('reprendre un badge ne défait pas les séances déjà tenues', async () => {
    await claimOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    const [opener] = (await listOpenPlayOpeners(db, { seasonCode: '25-26' })).filter(
      (o) => o.licence === MARIE.licence
    );

    await deleteOpenPlayOpener(db, { openerId: opener.id });

    // Le retrait veut dire « ne lui en confie plus », pas « annule ce qu'elle a promis » :
    // une séance qui redeviendrait « à pourvoir » dans le dos de tout le monde ferait
    // venir des gens devant une porte close.
    const [session] = await db.select().from(openPlaySessionsTable).all();
    expect(session).toMatchObject({ status: 'confirmed', openerFirstName: 'Marie' });
  });

  it('tolère le retrait d’un ouvreur inexistant', async () => {
    expect(await deleteOpenPlayOpener(db, { openerId: 9999 })).toEqual({ removed: false });
  });

  it('sépare les saisons', async () => {
    await saveOpenPlayOpener(db, { seasonCode: '26-27', licence: MARIE.licence }, NOW);
    expect(await listOpenPlayOpeners(db, { seasonCode: '25-26' })).toHaveLength(2);
    expect(await listOpenPlayOpeners(db, { seasonCode: '26-27' })).toHaveLength(1);
  });
});
