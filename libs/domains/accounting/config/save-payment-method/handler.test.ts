import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { createPaymentMethod, updatePaymentMethod } from './handler';
import { deletePaymentMethod } from '../delete-payment-method/handler';
import { listPaymentMethods } from '../list-payment-methods/handler';
import { createAccount, updateAccount } from '../save-account/handler';

describe('comptes de trésorerie', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('crée un compte sur une classe de trésorerie, et le refuse ailleurs', async () => {
    const created = await createAccount(db, { code: 'livret_b', label: 'Livret B', accountClassCode: '512', kind: 'bank' });
    expect(created).toMatchObject({ code: 'livret_b', kind: 'bank', active: true });
    await expect(createAccount(db, { code: 'x', label: 'X', accountClassCode: '60', kind: 'cash' })).rejects.toThrow(/trésorerie/);
    await expect(createAccount(db, { code: 'livret_b', label: 'Doublon', accountClassCode: '512', kind: 'bank' })).rejects.toMatchObject({ status: 409 });
  });

  it('ne désactive jamais le dernier compte bancaire actif', async () => {
    const banks = await db.all<{ id: number }>(sql`SELECT id FROM accounts WHERE kind = 'bank' AND active = 1`);
    // Le seed en a deux (courant, livret) : le premier s'éteint, le second est le dernier.
    await updateAccount(db, banks[0].id, { active: false });
    await expect(updateAccount(db, banks[1].id, { active: false })).rejects.toThrow(/dernier compte bancaire/);
  });

  it('reconnaît un compte bancaire au numéro que la banque écrit dans ses relevés, sans doublon', async () => {
    const [savings] = await db.all<{ id: number; statement_account_number: string | null }>(sql`SELECT id, statement_account_number FROM accounts WHERE code = 'savings'`);
    expect(savings.statement_account_number).toBe('00070007847');
    // Épuré des espaces ; un doublon est refusé, l'import ne saurait plus choisir.
    await expect(createAccount(db, { code: 'livret_b', label: 'Livret B', accountClassCode: '512', kind: 'bank', statementAccountNumber: '0007 0007 847' })).rejects.toMatchObject({ status: 409 });
    const created = await createAccount(db, { code: 'livret_b', label: 'Livret B', accountClassCode: '512', kind: 'bank', statementAccountNumber: ' 1234 5678 ' });
    expect(created.statementAccountNumber).toBe('12345678');
    const cleared = await updateAccount(db, created.id, { statementAccountNumber: '' });
    expect(cleared.statementAccountNumber).toBeNull();
  });

  it("laisse le compte d'attente des adhérents tranquille", async () => {
    const [advances] = await db.all<{ id: number }>(sql`SELECT id FROM accounts WHERE code = 'member_advances'`);
    await expect(updateAccount(db, advances.id, { active: false })).rejects.toThrow(/compte d'attente/);
  });
});

describe('moyens de paiement', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('propose aux adhérents les seuls moyens actifs et visibles, jamais le virement interne', async () => {
    const all = await listPaymentMethods(db);
    expect(all.map((m) => m.code)).toContain('virement_interne');
    const storefront = await listPaymentMethods(db, { offered: 'storefront' });
    expect(storefront.map((m) => m.code)).not.toContain('virement_interne');
    expect(storefront.map((m) => m.code)).not.toContain('cb'); // masqué de la boutique par la migration
    const admin = await listPaymentMethods(db, { offered: 'admin' });
    expect(admin.map((m) => m.code)).toContain('cb');
  });

  it('retire un moyen masqué de la boutique, et un moyen inactif de partout', async () => {
    const [labaz] = (await listPaymentMethods(db)).filter((m) => m.code === 'labaz');
    await updatePaymentMethod(db, labaz.id, { storefront: false });
    expect((await listPaymentMethods(db, { offered: 'storefront' })).map((m) => m.code)).not.toContain('labaz');
    expect((await listPaymentMethods(db, { offered: 'admin' })).map((m) => m.code)).toContain('labaz');
    await updatePaymentMethod(db, labaz.id, { active: false });
    expect((await listPaymentMethods(db, { offered: 'admin' })).map((m) => m.code)).not.toContain('labaz');
  });

  it('crée un moyen sur un compte actif et refuse la suppression dès qu’une écriture y renvoie', async () => {
    const created = await createPaymentMethod(db, { code: 'helloasso', label: 'HelloAsso', kind: 'transfer', defaultAccountCode: 'current', defaultEntryStatus: 'cleared' });
    expect(created.storefront).toBe(true);

    await db.run(sql`INSERT INTO seasons (id, code, name, start_date, end_date, active, created_at) VALUES (1, '25-26', 'S', '2025-09-01', '2026-08-31', 1, 0)`);
    await db.run(sql`INSERT INTO ledger_entries (season_id, account_id, category_id, type, amount_cents, date, payment_method_id, description, status, created_at)
      SELECT 1, a.id, c.id, 'recette', 1000, '2026-01-10', ${created.id}, 'Test', 'cleared', 0 FROM accounts a, categories c WHERE a.code = 'current' LIMIT 1`);
    await expect(deletePaymentMethod(db, created.id)).rejects.toMatchObject({ status: 409 });

    const unused = await createPaymentMethod(db, { code: 'lydia', label: 'Lydia', kind: 'transfer', defaultAccountCode: 'current', defaultEntryStatus: 'cleared' });
    await deletePaymentMethod(db, unused.id);
    expect((await listPaymentMethods(db)).map((m) => m.code)).not.toContain('lydia');
  });

  it('ne touche pas au virement interne', async () => {
    const [internal] = (await listPaymentMethods(db)).filter((m) => m.code === 'virement_interne');
    await expect(updatePaymentMethod(db, internal.id, { active: false })).rejects.toThrow(/virement interne/);
    await expect(deletePaymentMethod(db, internal.id)).rejects.toThrow(/virement interne/);
  });
});
