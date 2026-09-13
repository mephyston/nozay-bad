import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { getSeasonBalances } from './handler';

/**
 * Le solde d'ouverture d'un compte est le même partout où il s'affiche : la règle de
 * `shared/opening-balances.ts` (figé gagne, sinon calculé depuis l'exercice précédent)
 * vaut aussi pour les écrans par compte, qui lisaient jusqu'ici la seule table figée —
 * vide tant que l'exercice précédent n'est pas clôturé — et repartaient de zéro.
 */
describe('getSeasonBalances', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`INSERT INTO seasons (id, code, name, start_date, end_date, active, created_at)
      VALUES (1, '25-26', 'Saison 2025-2026', '2025-09-01', '2026-08-31', 0, 0),
             (2, '26-27', 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)`);
  });

  it('rend le solde figé quand la clôture l’a écrit', async () => {
    await db.run(sql`INSERT INTO season_balances (season_id, account_id, initial_balance_cents, created_at)
      SELECT 2, id, 109200, 0 FROM accounts WHERE code = 'badnet'`);
    const badnet = (await getSeasonBalances(db, '26-27')).find((b) => b.accountId === 'badnet');
    expect(badnet).toMatchObject({ initialBalanceCents: 109200, provisional: false });
  });

  it('calcule l’à-nouveau depuis l’exercice précédent quand rien n’est figé', async () => {
    // 25-26 : ouverture figée à 1 000 € sur Badnet, puis 92 € de recette datée avant le
    // 1er septembre 2026 → le 26-27 ouvre à 1 092 €, sans qu'aucune clôture ait eu lieu.
    await db.run(sql`INSERT INTO season_balances (season_id, account_id, initial_balance_cents, created_at)
      SELECT 1, id, 100000, 0 FROM accounts WHERE code = 'badnet'`);
    await db.run(sql`INSERT INTO ledger_entries (season_id, account_id, category_id, type, amount_cents, date, payment_method_id, description, status, created_at)
      SELECT 1, a.id, c.id, 'recette', 9200, '2026-06-15', p.id, 'Recharge', 'cleared', 0
      FROM accounts a, categories c, payment_methods p WHERE a.code = 'badnet' AND p.code = 'virement' LIMIT 1`);

    const balances = await getSeasonBalances(db, '26-27');
    const badnet = balances.find((b) => b.accountId === 'badnet');
    expect(badnet).toMatchObject({ initialBalanceCents: 109200, initialBalance: 109200, provisional: true });
    // Chaque compte a sa ligne, même à zéro : l'écran n'a plus à deviner l'absence.
    expect(balances.map((b) => b.accountId)).toContain('current');
  });
});
