import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import {
  seasonsTable,
  seasonBalancesTable,
  ledgerEntriesTable,
  bankStatementBalancesTable
} from './schema';
import { getReconciliationStatement } from '../bank/get-reconciliation-statement/handler';
import { getSeasonReports } from '../seasons/get-season-reports/handler';
import { listLedgerEntries } from '../ledger/list-ledger-entries/handler';

/**
 * Les trois écrans qui affichent un solde doivent partir du même solde d'ouverture.
 *
 * Ils ne le faisaient pas. À la même question — « combien y avait-il en caisse au 1er
 * septembre ? » — le bilan de trésorerie reconstituait la réponse depuis les exercices passés,
 * le rapprochement lisait `season_balances` et rendait `0`, et le grand livre partait de zéro
 * en resommant tout l'historique. Trois implémentations, trois réponses, et rien pour le
 * signaler : c'est en basculant la saison active sur 26-27 qu'on s'en est aperçu, l'écart de
 * rapprochement valant soudain toute la trésorerie d'ouverture pendant que le bilan, lui,
 * affichait le bon chiffre.
 *
 * Ce test est le garde-fou qui remplace la vigilance. Il ne vérifie pas une valeur : il
 * vérifie que les trois chemins s'accordent, quel que soit le chiffre. Une quatrième lecture
 * de `season_balances` qui repartirait de son côté le ferait tomber.
 */
describe("solde d'ouverture : les trois écrans s'accordent", () => {
  let db: any;

  const COURANT = 1;
  const VIREMENT = 1;
  const CATEGORIE = 1;

  const A_NOUVEAU_25_26 = 100_000;
  const RECETTE_JANVIER = 60_000;
  const DEPENSE_MARS = 10_000;
  /** Ce que les trois écrans doivent lire à l'ouverture de 26-27. */
  const OUVERTURE_26_27 = A_NOUVEAU_25_26 + RECETTE_JANVIER - DEPENSE_MARS;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    vi.setSystemTime(new Date('2026-09-20T09:00:00Z'));

    await db.insert(seasonsTable).values([
      {
        id: 1, code: '25-26', name: 'Saison 2025-2026',
        startDate: '2025-09-01', endDate: '2026-08-31',
        active: false, closedAt: null, createdAt: new Date()
      },
      {
        id: 2, code: '26-27', name: 'Saison 2026-2027',
        startDate: '2026-09-01', endDate: '2027-08-31',
        active: true, closedAt: null, createdAt: new Date()
      }
    ]);

    // 25-26 porte son report, hérité de la clôture de 24-25. 26-27 n'en a AUCUN : c'est le cas.
    await db.insert(seasonBalancesTable).values({
      seasonId: 1, accountId: COURANT, initialBalanceCents: A_NOUVEAU_25_26, createdAt: new Date()
    });

    await db.insert(ledgerEntriesTable).values([
      {
        seasonId: 1, type: 'recette', accountId: COURANT, categoryId: CATEGORIE,
        amountCents: RECETTE_JANVIER, date: '2026-01-15', paymentMethodId: VIREMENT,
        description: 'Subvention', status: 'cleared', createdAt: new Date()
      },
      {
        seasonId: 1, type: 'depense', accountId: COURANT, categoryId: CATEGORIE,
        amountCents: DEPENSE_MARS, date: '2026-03-20', paymentMethodId: VIREMENT,
        description: 'Matériel', status: 'cleared', createdAt: new Date()
      }
    ]);

    // Un relevé, sans quoi le rapprochement n'a pas de banque à qui se comparer.
    await db.insert(bankStatementBalancesTable).values({
      accountId: COURANT, date: '2026-09-30', balanceCents: OUVERTURE_26_27, createdAt: new Date()
    });
  });

  afterEach(() => vi.useRealTimers());

  /** Le solde d'ouverture tel que le rapprochement le lit. */
  const parLeRapprochement = async () =>
    (await getReconciliationStatement(db, { accountCode: 'current', seasonId: '26-27' }))
      .book.initialBalanceCents;

  /** Le même, tel que le bilan de trésorerie l'affiche. */
  const parLeBilan = async () =>
    (await getSeasonReports(db, '26-27')).bilanTrésorerie
      .find((b: any) => b.accountId === 'current')!.initialBalance;

  /**
   * Le même, déduit du grand livre : son solde progressif n'expose pas l'ouverture, mais la
   * première ligne vaut « ouverture + son propre montant ». On la lit à l'envers.
   */
  const parLeGrandLivre = async () => {
    await db.insert(ledgerEntriesTable).values({
      seasonId: 2, type: 'recette', accountId: COURANT, categoryId: CATEGORIE,
      amountCents: 1, date: '2026-09-02', paymentMethodId: VIREMENT,
      description: 'Sonde', status: 'cleared', createdAt: new Date()
    });
    const res: any = await listLedgerEntries(
      db,
      { seasonId: '26-27', accountId: 'current' } as any,
      { page: 1, limit: 10, runningBalance: true } as any
    );
    const sonde = res.data.find((l: any) => l.description === 'Sonde');
    return sonde.runningBalanceCents - sonde.amount;
  };

  it('le rapprochement lit le solde reconstitué', async () => {
    expect(await parLeRapprochement()).toBe(OUVERTURE_26_27);
  });

  it('le bilan de trésorerie lit le même', async () => {
    expect(await parLeBilan()).toBe(OUVERTURE_26_27);
  });

  it('le grand livre part du même', async () => {
    expect(await parLeGrandLivre()).toBe(OUVERTURE_26_27);
  });

  /*
   * Et la propriété elle-même, énoncée sans référence à une valeur attendue : c'est elle qui
   * survivra à un changement de règle. Si l'on décide un jour que l'ouverture se calcule
   * autrement, ce test doit rester vert — et tomber le jour où un seul des trois écrans
   * adopte la nouvelle règle.
   */
  it("les trois chemins rendent le même nombre, quel qu'il soit", async () => {
    const rapprochement = await parLeRapprochement();
    const bilan = await parLeBilan();
    const grandLivre = await parLeGrandLivre();

    expect({ bilan, grandLivre }).toEqual({ bilan: rapprochement, grandLivre: rapprochement });
  });

  /*
   * La même exigence une fois le report figé : les trois doivent alors lire la valeur écrite,
   * et non la recalculer. Sans ce second cas, un écran qui ignorerait le figé passerait
   * inaperçu tant que les deux chemins tombent d'accord par hasard.
   */
  it("s'accordent aussi sur un report figé, que personne ne recalcule", async () => {
    await db.insert(seasonBalancesTable).values({
      seasonId: 2, accountId: COURANT, initialBalanceCents: 123_456, createdAt: new Date()
    });

    expect(await parLeRapprochement()).toBe(123_456);
    expect(await parLeBilan()).toBe(123_456);
    expect(await parLeGrandLivre()).toBe(123_456);
  });
});
