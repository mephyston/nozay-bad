import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { openPlayOpenersTable } from '../../shared/open-play-schema';
import {
  MissingCancellationReasonError,
  MissingOpenerError,
  NotAnOpenerError,
  OpenPlaySessionNotFoundError
} from '../../shared/errors';
import { createOpenPlaySession } from '../create-open-play-session/handler';
import { registerToOpenPlay } from '../register-to-open-play/handler';
import { listOpenPlayRegistrations } from '../list-open-play-registrations/handler';
import { updateOpenPlaySession } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');
const MARIE = { openerLicence: '00000009', openerFirstName: 'Marie', openerLastName: 'Dupuis' };

let db: Db;
let venueId: number;
let sessionId: number;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
  const session = await createOpenPlaySession(
    db,
    { seasonCode: '25-26', venueId, date: '2026-03-21', startTime: '14:00', endTime: '17:00' },
    NOW
  );
  sessionId = session.id;

  await db
    .insert(openPlayOpenersTable)
    .values({ seasonCode: '25-26', licence: '00000009', createdAt: NOW });
});

describe('corrections du bureau', () => {
  it('ne change que ce qu’on lui donne', async () => {
    const updated = await updateOpenPlaySession(db, { sessionId, startTime: '15:00' }, NOW);
    expect(updated).toMatchObject({ startTime: '15:00', endTime: '17:00', minPlayers: 4 });
  });

  it('refuse une séance inconnue', async () => {
    await expect(updateOpenPlaySession(db, { sessionId: 9999 }, NOW)).rejects.toThrow(
      OpenPlaySessionNotFoundError
    );
  });

  it('refuse un horaire qui inverserait l’intervalle existant', async () => {
    // Seul `startTime` change, mais il doit rester cohérent avec la fin déjà en base.
    await expect(updateOpenPlaySession(db, { sessionId, startTime: '18:00' }, NOW)).rejects.toThrow(
      'heure de fin'
    );
  });
});

describe('désignation manuelle de l’ouvreur', () => {
  it('confirme la séance et recopie le nom', async () => {
    const updated = await updateOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    expect(updated).toMatchObject({
      status: 'confirmed',
      openerLicence: '00000009',
      openerFirstName: 'Marie'
    });
    expect(updated.openedAt).not.toBeNull();
  });

  it('refuse quelqu’un qui n’est pas de la liste', async () => {
    // Sans quoi la liste des ouvreurs ne serait qu'une décoration.
    await expect(
      updateOpenPlaySession(db, { sessionId, openerLicence: '00000001' }, NOW)
    ).rejects.toThrow(NotAnOpenerError);
  });

  it('rouvre la séance quand on retire l’ouvreur', async () => {
    await updateOpenPlaySession(db, { sessionId, ...MARIE }, NOW);
    const reopened = await updateOpenPlaySession(db, { sessionId, openerLicence: null }, NOW);

    expect(reopened).toMatchObject({
      status: 'open',
      openerLicence: null,
      openerFirstName: null,
      openedAt: null
    });
  });

  it('refuse de confirmer une séance sans ouvreur', async () => {
    // C'est l'invariant du domaine : « confirmée » veut dire « quelqu'un ouvrira ».
    await expect(
      updateOpenPlaySession(db, { sessionId, status: 'confirmed' }, NOW)
    ).rejects.toThrow(MissingOpenerError);
  });

  it('accepte de confirmer quand l’ouvreur arrive dans la même écriture', async () => {
    await expect(
      updateOpenPlaySession(db, { sessionId, status: 'confirmed', ...MARIE }, NOW)
    ).resolves.toMatchObject({ status: 'confirmed' });
  });
});

describe('annulation', () => {
  it('exige un motif', async () => {
    await expect(
      updateOpenPlaySession(db, { sessionId, status: 'cancelled' }, NOW)
    ).rejects.toThrow(MissingCancellationReasonError);
  });

  it('conserve les inscriptions', async () => {
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

    await updateOpenPlaySession(
      db,
      { sessionId, status: 'cancelled', cancelledReason: 'Gymnase fermé' },
      NOW
    );

    // On n'efface pas l'historique : la trace de qui comptait venir a de la valeur.
    const { totals } = await listOpenPlayRegistrations(db, { sessionId });
    expect(totals).toEqual({ members: 1, guests: 1, players: 2 });
  });

  it('efface le motif quand la séance rouvre', async () => {
    await updateOpenPlaySession(
      db,
      { sessionId, status: 'cancelled', cancelledReason: 'Gymnase fermé' },
      NOW
    );
    const reopened = await updateOpenPlaySession(db, { sessionId, status: 'open' }, NOW);

    // Garder le motif ferait lire « annulée : gymnase fermé » sous une séance qui
    // accepte de nouveau des inscriptions.
    expect(reopened).toMatchObject({ status: 'open', cancelledReason: null });
  });
});
