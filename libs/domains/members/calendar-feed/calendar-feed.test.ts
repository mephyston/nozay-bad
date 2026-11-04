import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { saveCalendarFeed } from './save-calendar-feed/handler';
import { getCalendarFeed } from './get-calendar-feed/handler';
import { deleteCalendarFeed } from './delete-calendar-feed/handler';
import { resolveCalendarProfileByLicence, resolveCalendarProfileByToken } from './resolve-calendar-profile/handler';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const LICENCE = '07104079';
const TODAY = '2026-02-01';

async function seed(status: 'valide' | 'suspendu' | 'en_attente' = 'valide', seasonId = 1) {
  const { db } = await setupMockDb();
  await db.run(sql`INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at) VALUES
    (1, '25-26', 'Saison 25-26', '2025-09-01', '2026-08-31', 1, strftime('%s', 'now')),
    (2, '26-27', 'Saison 26-27', '2026-09-01', '2027-08-31', 0, strftime('%s', 'now'))`);
  await insertMemberFixture(db, {
    id: 10, licence: LICENCE, seasonId, lastName: 'DUPONT', firstName: 'Léo', gender: 'M', birthDate: '2012-01-01',
    status, type: 'jeune', amountDueCents: 0, amountReceivedCents: 0, amountRemainingCents: 0
  });
  return db;
}

describe("abonnement à l'agenda d'une personne", () => {
  it("retrouve le profil et son adhésion depuis l'empreinte", async () => {
    const db = await seed();
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_A });

    expect(await resolveCalendarProfileByToken(db, HASH_A, TODAY)).toEqual({
      licence: LICENCE,
      firstName: 'Léo',
      membership: { memberId: 10, seasonCode: '25-26' }
    });
    expect((await getCalendarFeed(db, LICENCE)).subscribed).toBe(true);
  });

  it("une empreinte inconnue n'ouvre rien", async () => {
    const db = await seed();
    expect(await resolveCalendarProfileByToken(db, HASH_A, TODAY)).toBeNull();
    expect((await getCalendarFeed(db, LICENCE)).subscribed).toBe(false);
  });

  it("régénérer révoque l'adresse précédente, sans créer de seconde ligne", async () => {
    const db = await seed();
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_A });
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_B });

    expect(await resolveCalendarProfileByToken(db, HASH_A, TODAY)).toBeNull();
    expect(await resolveCalendarProfileByToken(db, HASH_B, TODAY)).not.toBeNull();
  });

  it('couper un abonnement est sans appel, et sans erreur s’il n’y en a pas', async () => {
    const db = await seed();
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_A });
    await deleteCalendarFeed(db, LICENCE);
    await deleteCalendarFeed(db, LICENCE);

    expect(await resolveCalendarProfileByToken(db, HASH_A, TODAY)).toBeNull();
  });

  it('refuse une licence inconnue', async () => {
    const db = await seed();
    await expect(saveCalendarFeed(db, { licence: '99999999', tokenHash: HASH_A })).rejects.toThrow('introuvable');
  });

  it('sans adhésion à la saison du jour, le profil reste connu mais sans adhésion', async () => {
    const db = await seed();
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_A });

    // Le lendemain de la fin de saison, sans renouvellement.
    const lapsed = await resolveCalendarProfileByToken(db, HASH_A, '2026-09-02');
    expect(lapsed?.membership).toBeNull();
  });

  it("l'abonnement survit au renouvellement : l'adhésion de la nouvelle saison prend le relais", async () => {
    const db = await seed();
    await saveCalendarFeed(db, { licence: LICENCE, tokenHash: HASH_A });
    await insertMemberFixture(db, {
      id: 20, licence: LICENCE, seasonId: 2, lastName: 'DUPONT', firstName: 'Léo', gender: 'M', birthDate: '2012-01-01',
      status: 'valide', type: 'jeune', amountDueCents: 0, amountReceivedCents: 0, amountRemainingCents: 0
    });

    const renewed = await resolveCalendarProfileByToken(db, HASH_A, '2026-09-02');
    expect(renewed?.membership).toEqual({ memberId: 20, seasonCode: '26-27' });
  });

  it('un dossier annulé ne donne plus rien, un dossier en attente de paiement si', async () => {
    const cancelled = await seed('suspendu');
    expect((await resolveCalendarProfileByLicence(cancelled, LICENCE, TODAY))?.membership).toBeNull();

    const pending = await seed('en_attente');
    expect((await resolveCalendarProfileByLicence(pending, LICENCE, TODAY))?.membership?.memberId).toBe(10);
  });
});
