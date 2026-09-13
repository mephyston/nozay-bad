import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { isValidIban, isValidTimezone, updateClubSettings } from './handler';
import { getClubSettings } from '../shared/repository';
import { updateClubFeatures } from '../update-club-features/handler';
import { forgetClubFeatures, getClubFeatures, listTreasuryAccounts } from '../shared/repository';
import { sql } from 'drizzle-orm';

describe('isValidIban', () => {
  it('accepte un IBAN à clé juste, espaces compris', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
    expect(isValidIban('GB82WEST12345698765432')).toBe(true);
  });
  it('refuse une clé fausse ou une forme impossible', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
    expect(isValidIban('FR76')).toBe(false);
  });
});

describe('isValidTimezone', () => {
  it('connaît les fuseaux IANA et refuse le reste', () => {
    expect(isValidTimezone('Europe/Paris')).toBe(true);
    expect(isValidTimezone('Indian/Reunion')).toBe(true);
    expect(isValidTimezone('Paris')).toBe(false);
  });
});

describe('updateClubSettings', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('lit la ligne semée par la migration', async () => {
    const settings = await getClubSettings(db);
    expect(settings.shortName).toBeTruthy();
    expect(settings.partnerLogoKeys).toEqual([]);
  });

  it('écrit une section et relit la valeur, rognée', async () => {
    const after = await updateClubSettings(
      db,
      'identity',
      {
        name: '  Club Test  ',
        shortName: 'CT',
        tagline: '',
        city: 'Testville',
        postalCode: '99999',
        department: '99',
        region: 'Nulle-Part',
        addressLines: ''
      },
      'president@example.org'
    );
    expect(after.name).toBe('Club Test');
    expect(after.updatedByEmail).toBe('president@example.org');
    // Une autre section n'a pas bougé.
    expect(after.teamPrefix).not.toBe('');
  });

  it("ignore un champ d'une autre section glissé dans le corps", async () => {
    const before = await getClubSettings(db);
    await updateClubSettings(
      db,
      'bank',
      { bankHolder: 'X', bankName: 'Y', iban: '', bic: '', teamPrefix: 'HACK' } as any,
      'a@b.c'
    );
    expect((await getClubSettings(db)).teamPrefix).toBe(before.teamPrefix);
  });

  it('refuse un IBAN à clé fausse et range un IBAN juste par groupes de quatre', async () => {
    await expect(
      updateClubSettings(db, 'bank', { bankHolder: '', bankName: '', iban: 'FR7630006000011234567890188', bic: '' }, 'a@b.c')
    ).rejects.toThrow(/IBAN/);
    const after = await updateClubSettings(
      db,
      'bank',
      { bankHolder: '', bankName: '', iban: 'fr7630006000011234567890189', bic: 'agrifrpp' },
      'a@b.c'
    );
    expect(after.iban).toBe('FR76 3000 6000 0112 3456 7890 189');
    expect(after.bic).toBe('AGRIFRPP');
  });

  it('refuse un fuseau horaire inconnu', async () => {
    await expect(
      updateClubSettings(
        db,
        'sending',
        {
          timezone: 'Mars/Olympus',
          dailySendHour: 8,
          weeklySendDay: 'MON',
          weeklySendHour: 9,
          unpaidReminderDelayDays: 7,
          emailSignature: '',
          memberWelcomeText: ''
        },
        'a@b.c'
      )
    ).rejects.toThrow(/Fuseau/);
  });
});

describe('updateClubFeatures', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('tout est allumé tant que rien n’a été réglé', async () => {
    const state = await getClubFeatures(db);
    expect(state.shop).toBe(true);
    expect(state.reminder_unpaid).toBe(true);
  });

  it('éteint, rallume, et applique les préalables à la relecture', async () => {
    let state = await updateClubFeatures(db, { shop: false, push: false }, 'a@b.c');
    expect(state.shop).toBe(false);
    expect(state.reminder_unpaid).toBe(false); // préalable `push` éteint

    state = await updateClubFeatures(db, { push: true }, 'a@b.c');
    expect(state.reminder_unpaid).toBe(true);
    expect(state.shop).toBe(false); // l'autre réglage tient
  });

  it('ferme la comptabilité à un club sans compte bancaire actif, pas les factures ni les notes de frais', async () => {
    expect((await getClubFeatures(db)).accounting).toBe(true);
    await db.run(sql`UPDATE accounts SET active = 0 WHERE kind = 'bank'`);
    forgetClubFeatures(db);
    const state = await getClubFeatures(db);
    expect(state.accounting).toBe(false);
    expect(state.checks).toBe(false);
    expect(state.invoices).toBe(true);
    expect(state.expenses).toBe(true);
  });

  it('rend les comptes actifs avec leur nature, pour les menus', async () => {
    const accounts = await listTreasuryAccounts(db);
    expect(accounts.map((a) => [a.code, a.kind])).toEqual([
      ['current', 'bank'], ['savings', 'bank'], ['cash', 'cash'], ['badnet', 'wallet'], ['member_advances', 'third_party']
    ]);
  });
});
