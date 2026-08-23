import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { scheduleSlotsTable, venuesTable } from '../../shared/schema';
import { openPlaySessionsTable } from '../../shared/open-play-schema';
import {
  InvalidSessionDateError,
  NoOpenPlaySlotError,
  RangeTooWideError
} from '../../shared/errors';
import { claimOpenPlaySession } from '../claim-open-play-session/handler';
import { saveOpenPlayOpener } from '../save-open-play-opener/handler';
import { generateOpenPlaySessions } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

/** `weekday` en ISO : 6 = samedi, 2 = mardi. */
async function seedSlot(weekday: number, over: Record<string, unknown> = {}) {
  const [slot] = await db
    .insert(scheduleSlotsTable)
    .values({
      seasonCode: '25-26',
      venueId,
      weekday,
      startTime: '14:00',
      endTime: '17:00',
      audience: 'jeu_libre',
      createdAt: NOW,
      ...over
    })
    .returning();
  return slot;
}

const sessions = async () =>
  db.select().from(openPlaySessionsTable).orderBy(openPlaySessionsTable.date).all();

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('génération en lot', () => {
  it('déroule un créneau hebdomadaire sur la période', async () => {
    const slot = await seedSlot(6); // samedi

    // Du lundi 16 au dimanche 29 mars : deux samedis.
    const result = await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' },
      NOW
    );

    expect(result).toEqual({ created: 2, skipped: 0 });
    const rows = await sessions();
    expect(rows.map((r) => r.date)).toEqual(['2026-03-21', '2026-03-28']);
    // La séance garde le lien vers le créneau dont elle découle.
    expect(rows.every((r) => r.slotId === slot.id)).toBe(true);
    expect(rows.every((r) => r.startTime === '14:00' && r.endTime === '17:00')).toBe(true);
  });

  it('croise plusieurs créneaux', async () => {
    await seedSlot(2, { startTime: '20:00', endTime: '22:00' }); // mardi
    await seedSlot(6); // samedi

    const result = await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' },
      NOW
    );

    expect(result.created).toBe(4);
    expect((await sessions()).map((r) => r.date)).toEqual([
      '2026-03-17',
      '2026-03-21',
      '2026-03-24',
      '2026-03-28'
    ]);
  });

  it('est rejouable : rien de neuf, rien d’écrasé', async () => {
    await seedSlot(6);
    await generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' }, NOW);

    const again = await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' },
      NOW
    );

    expect(again).toEqual({ created: 0, skipped: 2 });
    expect(await sessions()).toHaveLength(2);
  });

  it('NE DÉFAIT PAS une séance déjà pourvue', async () => {
    // Le test central : un `DO UPDATE` au lieu d'un `DO NOTHING` remettrait le statut à
    // « ouverte » et effacerait l'ouvreur — des gens viendraient devant une porte close.
    await seedSlot(6);
    await generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' }, NOW);
    await saveOpenPlayOpener(db, { seasonCode: '25-26', licence: '00000009' }, NOW);
    const [first] = await sessions();
    await claimOpenPlaySession(
      db,
      { sessionId: first.id, licence: '00000009', firstName: 'Marie', lastName: 'Dupuis' },
      NOW
    );

    await generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-04-30' }, NOW);

    const [kept] = await db
      .select()
      .from(openPlaySessionsTable)
      .where(eq(openPlaySessionsTable.id, first.id))
      .all();
    expect(kept).toMatchObject({ status: 'confirmed', openerFirstName: 'Marie' });
  });

  it('applique un seuil propre à la génération', async () => {
    await seedSlot(6);
    await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29', minPlayers: 6 },
      NOW
    );
    expect((await sessions()).every((r) => r.minPlayers === 6)).toBe(true);
  });

  it('ne retient que les créneaux demandés', async () => {
    await seedSlot(2, { startTime: '20:00', endTime: '22:00' });
    const saturday = await seedSlot(6);

    await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29', slotIds: [saturday.id] },
      NOW
    );
    expect((await sessions()).map((r) => r.date)).toEqual(['2026-03-21', '2026-03-28']);
  });
});

describe('ce que la génération ignore', () => {
  it('ignore un créneau masqué du site', async () => {
    // Masquer un créneau est justement la façon dont le bureau retire un horaire.
    await seedSlot(6, { active: false });
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' }, NOW)
    ).rejects.toThrow(NoOpenPlaySlotError);
  });

  it('ignore les créneaux d’un autre public', async () => {
    await seedSlot(6, { audience: 'adultes_loisir' });
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' }, NOW)
    ).rejects.toThrow(NoOpenPlaySlotError);
  });

  it('ignore les créneaux d’une autre saison', async () => {
    await seedSlot(6, { seasonCode: '24-25' });
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2026-03-29' }, NOW)
    ).rejects.toThrow(NoOpenPlaySlotError);
  });
});

describe('bornes de la période', () => {
  it('refuse une période inversée', async () => {
    await seedSlot(6);
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-29', to: '2026-03-16' }, NOW)
    ).rejects.toThrow(InvalidSessionDateError);
  });

  it('refuse une date qui n’existe pas', async () => {
    await seedSlot(6);
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-02-31', to: '2026-03-16' }, NOW)
    ).rejects.toThrow(InvalidSessionDateError);
  });

  it('refuse au-delà d’un an — la faute de frappe sur l’année', async () => {
    await seedSlot(6);
    await expect(
      generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-16', to: '2036-03-16' }, NOW)
    ).rejects.toThrow(RangeTooWideError);
  });

  it('génère une saison entière, par lots', async () => {
    // Deux créneaux sur douze mois : bien au-delà d'un lot D1. C'est ce qui verrouille le
    // découpage.
    await seedSlot(2, { startTime: '20:00', endTime: '22:00' });
    await seedSlot(6);

    const result = await generateOpenPlaySessions(
      db,
      { seasonCode: '25-26', from: '2025-09-01', to: '2026-06-30' },
      NOW
    );

    expect(result.created).toBeGreaterThan(80);
    expect(result.skipped).toBe(0);
    expect(await sessions()).toHaveLength(result.created);
  });

  it('traverse un changement d’heure sans décaler les dates', async () => {
    await seedSlot(7); // dimanche
    await generateOpenPlaySessions(db, { seasonCode: '25-26', from: '2026-03-22', to: '2026-04-05' }, NOW);
    // Le 29 mars est le dimanche du passage à l'heure d'été.
    expect((await sessions()).map((r) => r.date)).toEqual([
      '2026-03-22',
      '2026-03-29',
      '2026-04-05'
    ]);
  });
});
