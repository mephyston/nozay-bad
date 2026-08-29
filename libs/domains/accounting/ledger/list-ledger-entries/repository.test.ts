import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { ListTransactionsRepository } from './repository';

/**
 * Le solde progressif du grand livre.
 *
 * Il était calculé par une sous-requête corrélée — un balayage des écritures du compte
 * par ligne affichée — remplacée par une fonction de fenêtrage qui les cumule en une
 * passe. Aucun test ne vérifiait les valeurs produites : le changement pouvait donc
 * fausser tous les soldes de la page sans qu'une seule assertion ne tombe.
 *
 * Ce qui est éprouvé ici, ce n'est pas la performance — invisible d'un test — mais que
 * les trois propriétés qui font la justesse du solde ont survécu : le report à nouveau
 * s'ajoute, la ligne courante est incluse dans son propre cumul, et **le cumul reste
 * celui du compte** même lorsqu'un filtre masque des écritures.
 */

const REPO = new ListTransactionsRepository();

/**
 * Le référentiel — comptes, modes de règlement, catégories — est déjà semé par la
 * migration `0001_seed_reference_data`. On ne le recrée donc pas : on lit ses
 * identifiants, ce qui évite de dépendre d'un ordre d'insertion qui n'est pas le nôtre.
 */
async function seed(db: Awaited<ReturnType<typeof setupMockDb>>['db']) {
  const idDe = async (requete: ReturnType<typeof sql>) =>
    ((await db.get(requete)) as { id: number }).id;

  const courant = await idDe(sql`SELECT id FROM accounts WHERE code = 'current'`);
  const epargne = await idDe(sql`SELECT id FROM accounts WHERE code = 'savings'`);
  const virement = await idDe(sql`SELECT id FROM payment_methods WHERE code = 'virement'`);
  const cotisations = await idDe(sql`SELECT id FROM categories ORDER BY id LIMIT 1`);
  const autre = await idDe(sql`SELECT id FROM categories ORDER BY id LIMIT 1 OFFSET 1`);

  await db.run(sql`INSERT INTO seasons (id, code, name, start_date, end_date, active, created_at)
    VALUES (1, '25-26', 'Saison 25-26', '2025-09-01', '2026-08-31', 1, 0)`);
  await db.run(sql`INSERT INTO season_balances (season_id, account_id, initial_balance_cents, created_at)
    VALUES (1, ${courant}, 10000, 0)`);

  // Trois écritures sur le compte courant, plus une sur un autre compte : cette dernière
  // ne doit jamais entrer dans le cumul.
  const lignes: [number, string, number, number, string, number][] = [
    [1, 'recette', courant, 5000, '2025-10-01', cotisations],
    [2, 'depense', courant, 2000, '2025-10-02', autre],
    [3, 'recette', courant, 1500, '2025-10-03', cotisations],
    [4, 'recette', epargne, 9999, '2025-10-02', cotisations]
  ];
  for (const [id, type, accountId, montant, date, categorie] of lignes) {
    await db.run(sql`INSERT INTO ledger_entries
      (id, season_id, type, account_id, category_id, amount_cents, date, payment_method_id, description, created_at)
      VALUES (${id}, 1, ${type}, ${accountId}, ${categorie}, ${montant}, ${date}, ${virement}, ${'écriture ' + id}, 0)`);
  }

  return { cotisations };
}

describe('solde progressif', () => {
  it('part du report à nouveau et inclut la ligne courante', async () => {
    const { db } = await setupMockDb();
    await seed(db);

    const lignes = await REPO.list(db, { seasonId: '25-26', accountId: 'current' }, { limit: 50, offset: 0 });

    // Rendues de la plus récente à la plus ancienne : 10000 + 5000 − 2000 + 1500.
    expect(lignes.map((l) => [l.id, l.runningBalanceCents])).toEqual([
      [3, 14500],
      [2, 13000],
      [1, 15000]
    ]);
  });

  it('ignore les écritures des autres comptes', async () => {
    const { db } = await setupMockDb();
    await seed(db);

    const lignes = await REPO.list(db, { seasonId: '25-26', accountId: 'savings' }, { limit: 50, offset: 0 });

    // Aucun report à nouveau sur ce compte, et les 8 500 du compte courant n'y sont pas.
    expect(lignes.map((l) => [l.id, l.runningBalanceCents])).toEqual([[4, 9999]]);
  });

  it('garde le cumul du compte quand un filtre masque des écritures', async () => {
    const { db } = await setupMockDb();
    const { cotisations } = await seed(db);

    const lignes = await REPO.list(
      db,
      { seasonId: '25-26', accountId: 'current', category: String(cotisations) },
      { limit: 50, offset: 0 }
    );

    /*
     * La dépense de 2 000 est masquée par le filtre, mais elle reste déduite : le solde
     * affiché est celui du compte à cette date, pas la somme des lignes visibles. Cumuler
     * les seules lignes rendues donnerait 15 000 puis 16 500 — un solde qui n'a jamais
     * existé, et qui ne se raccorderait à aucun relevé.
     */
    expect(lignes.map((l) => [l.id, l.runningBalanceCents])).toEqual([
      [3, 14500],
      [1, 15000]
    ]);
  });

  it('ne calcule rien quand le solde progressif n’est pas demandé', async () => {
    const { db } = await setupMockDb();
    await seed(db);

    const lignes = await REPO.list(
      db,
      { seasonId: '25-26', accountId: 'current' },
      { limit: 50, offset: 0, runningBalance: false }
    );

    expect(lignes).toHaveLength(3);
    expect(lignes[0].runningBalanceCents).toBeUndefined();
  });
});
