import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { seasonsTable } from '@nba/accounting/schema';
import { insertMemberFixture } from './test-fixtures';
import { getContactEmailsForLicences } from './queries';

/**
 * Résolution licence → adresses, ce que réclame l'alerte aux ouvreurs : le domaine des
 * créneaux ne connaît que des licences, et ne peut pas traverser jusqu'ici.
 */

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  await db.insert(seasonsTable).values([
    { id: 1, code: '25-26', name: '2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: NOW },
    { id: 2, code: '26-27', name: '2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: false, createdAt: NOW }
  ]);
});

describe('getContactEmailsForLicences', () => {
  it('rend l’adresse de l’adhérent et celles de ses parents', async () => {
    await insertMemberFixture(db, {
      licence: '00000001',
      seasonId: 1,
      email: 'Camille@Example.org',
      parent1Email: 'papa@example.org',
      parent2Email: 'maman@example.org'
    });

    const emails = await getContactEmailsForLicences(db, '25-26', ['00000001']);
    // Minuscules et dédupliquées, comme les autres ciblages.
    expect(emails.sort()).toEqual(['camille@example.org', 'maman@example.org', 'papa@example.org']);
  });

  it('dédoublonne une adresse partagée par une fratrie', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'foyer@example.org' });
    await insertMemberFixture(db, { licence: '00000002', seasonId: 1, email: 'foyer@example.org' });

    expect(await getContactEmailsForLicences(db, '25-26', ['00000001', '00000002'])).toEqual([
      'foyer@example.org'
    ]);
  });

  it('écarte qui n’a pas repris sa licence', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'ancien@example.org' });
    await insertMemberFixture(db, { licence: '00000002', seasonId: 2, email: 'actuel@example.org' });

    expect(await getContactEmailsForLicences(db, '26-27', ['00000001', '00000002'])).toEqual([
      'actuel@example.org'
    ]);
  });

  it('ne dégénère jamais en « tout le club »', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'camille@example.org' });
    // Liste vide = personne. C'est la garde qui compte le plus : l'appelant est un
    // traitement programmé, personne ne relit ce qu'il envoie.
    expect(await getContactEmailsForLicences(db, '25-26', [])).toEqual([]);
  });

  it('rend une liste vide sur une saison inconnue', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'camille@example.org' });
    expect(await getContactEmailsForLicences(db, '99-00', ['00000001'])).toEqual([]);
  });

  it('ignore une licence inconnue sans se plaindre', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'camille@example.org' });
    expect(await getContactEmailsForLicences(db, '25-26', ['00000001', '00000099'])).toEqual([
      'camille@example.org'
    ]);
  });
});
