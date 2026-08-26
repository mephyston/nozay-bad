import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import { seasonsTable, ledgerEntriesTable, categoriesTable, accountClassesTable } from '../../shared/schema';
import { listLedgerEntries } from './handler';

/**
 * Filtrer le grand livre par classe de compte.
 *
 * Le lien posé par le compte de résultat désigne une classe par son **code** (`60`, `70`…). Le
 * filtre le passait à `Number()` et le comparait à `receipt_account_class_id` /
 * `expense_account_class_id`, qui portent des identifiants de ligne (1 à 12). Aucun code ne
 * pouvant valoir un identifiant, la liste des catégories ressortait vide et la condition retombait
 * sur `1 = 0` : l'écran s'ouvrait vide, à tous les coups, depuis toujours.
 *
 * Ces tests tournent sur la base réelle et son seed : ce sont précisément les identifiants du seed
 * qui étaient en cause, un double n'aurait rien prouvé.
 */
describe('filtre du grand livre par classe de compte', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });

    // « Volants » se rattache au 70 en produit et au 60 en charge : le cas à deux sens.
    const volants = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Volants')).get();

    await db.insert(ledgerEntriesTable).values([
      { seasonId: 1, type: 'recette', accountId: 1, categoryId: volants.id, amountCents: 3_150, date: '2025-10-01', paymentMethodId: 1, description: 'Vente de volants', createdAt: new Date() },
      { seasonId: 1, type: 'depense', accountId: 1, categoryId: volants.id, amountCents: 12_600, date: '2025-10-02', paymentMethodId: 1, description: 'Achat de volants', createdAt: new Date() }
    ]);
  });

  const codeOf = async (code: string) =>
    (await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, code)).get());

  it('trouve les écritures par le code de la classe, et non par son identifiant', async () => {
    const res = await listLedgerEntries(db, { seasonId: '1', classCode: '60' }, { page: 1, limit: 20 });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].description).toBe('Achat de volants');
  });

  it("ne ramène que le sens de la classe : le 60 est une charge, pas une vente", async () => {
    /*
     * Chercher la classe des deux côtés ramenait la vente ET l'achat, puisque « Volants » porte
     * les deux rattachements. Cliquer sur « 60 - Achats » depuis la colonne des charges doit
     * montrer des achats.
     */
    const charges = await listLedgerEntries(db, { seasonId: '1', classCode: '60' }, { page: 1, limit: 20 });
    const produits = await listLedgerEntries(db, { seasonId: '1', classCode: '70' }, { page: 1, limit: 20 });

    expect(charges.data.every((t: any) => t.type === 'depense')).toBe(true);
    expect(produits.data.every((t: any) => t.type === 'recette')).toBe(true);
    expect(produits.data).toHaveLength(1);
    expect(produits.data[0].description).toBe('Vente de volants');
  });

  it("accepte aussi l'identifiant de la classe, que d'anciens liens portent", async () => {
    const classe60 = await codeOf('60');
    const res = await listLedgerEntries(db, { seasonId: '1', classCode: String(classe60.id) }, { page: 1, limit: 20 });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].description).toBe('Achat de volants');
  });

  it('rend une liste vide pour une classe inexistante, sans se plaindre', async () => {
    const res = await listLedgerEntries(db, { seasonId: '1', classCode: '999' }, { page: 1, limit: 20 });
    expect(res.data).toHaveLength(0);
    expect(res.pagination.total).toBe(0);
  });

  it('compte et liste s\'accordent : le filtre vit dans buildConditions, pas dupliqué', async () => {
    /*
     * Le bloc était recopié dans `count()` et dans `list()`. Deux copies d'une même condition
     * finissent par diverger — et la pagination annonce alors un nombre que la page ne montre pas.
     */
    const res = await listLedgerEntries(db, { seasonId: '1', classCode: '60' }, { page: 1, limit: 20 });
    expect(res.pagination.total).toBe(res.data.length);
  });
});
