import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import {
  seasonBalancesTable,
  bankStatementLinesTable,
  bankStatementBalancesTable,
  ledgerEntriesTable
} from '../../shared/schema';
import { getReconciliationStatement } from './handler';
import { updateSeasonBalances } from '../../seasons/update-season-balances/handler';
import { closeSeason, getCloseSeasonChecks } from '../../seasons/close-season/handler';

/**
 * Le passage d'exercice quand la clôture n'a pas encore eu lieu.
 *
 * La situation, constatée en production le 1er septembre 2026 : l'exercice 26-27 est activé
 * parce que la vie du club continue, mais 25-26 reste ouvert — des charges d'août arriveront
 * encore. Or `season_balances.initial_balance_cents` n'est écrit que par
 * `closeSeasonWithRollover` : tant que 25-26 n'est pas clôturé, 26-27 n'a **aucun** à-nouveau,
 * et `getInitialBalanceCents` rend `0`.
 *
 * Ce `0` n'est pas neutre. Le rapprochement compare le solde que la banque annonce à un solde
 * comptable reconstitué depuis l'à-nouveau : sans à-nouveau, l'écart affiché vaut exactement
 * toute la trésorerie d'ouverture. Rien n'est faux dans les données, c'est le report qui
 * manque — mais l'écran, lui, annonce un écart de plusieurs milliers d'euros.
 *
 * Ces tests posent le scénario complet : l'écart, sa disparition sur un à-nouveau provisoire,
 * puis son écrasement par la valeur définitive à la clôture.
 *
 * Les dates sont POSÉES, jamais subies : `vitest.setup.clock.ts` fige la suite au 30 août 2026,
 * ce qui est justement la veille du basculement qu'on veut décrire.
 */
describe("bascule d'exercice sans clôture", () => {
  let db: any;

  /* Les comptes et moyens de paiement viennent du seed des migrations : 1 = « current ». */
  const COMPTE_COURANT = 1;
  const VIREMENT = 1;
  const CATEGORIE = 1;

  /** Solde de trésorerie reporté de 24-25 sur 25-26. */
  const A_NOUVEAU_25_26 = 100_000;
  /** Une recette de janvier, pointée : elle porte le solde de clôture à 1 500 €. */
  const RECETTE_JANVIER = 50_000;
  /** Solde de clôture de 25-26 au 31 août — donc l'à-nouveau que 26-27 doit recevoir. */
  const CLOTURE_25_26 = A_NOUVEAU_25_26 + RECETTE_JANVIER;
  /** Une dépense de septembre, pointée : elle appartient déjà à 26-27. */
  const DEPENSE_SEPTEMBRE = 5_000;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    // Le 20 septembre : 25-26 est terminé et non clôturé, 26-27 est actif depuis trois semaines.
    vi.setSystemTime(new Date('2026-09-20T09:00:00Z'));

    await db.insert(seasonsTable).values([
      {
        id: 1,
        code: '25-26',
        name: 'Saison 2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-08-31',
        active: false,
        closedAt: null,
        createdAt: new Date()
      },
      {
        id: 2,
        code: '26-27',
        name: 'Saison 2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-08-31',
        active: true,
        closedAt: null,
        createdAt: new Date()
      }
    ]);

    // L'à-nouveau de 25-26, lui, existe : 24-25 a bien été clôturé en son temps.
    await db.insert(seasonBalancesTable).values({
      seasonId: 1, accountId: COMPTE_COURANT, initialBalanceCents: A_NOUVEAU_25_26, createdAt: new Date()
    });

    /*
     * Les deux lignes de relevé sont `reconciled` : un « pending » daté dans 25-26 bloquerait
     * la clôture (contrôle PENDING_BANK_TRANSACTIONS), et ce n'est pas ce qu'on teste ici.
     */
    await db.insert(bankStatementLinesTable).values([
      { id: 1, fitid: 'FIT-JANV', accountId: COMPTE_COURANT, amountCents: RECETTE_JANVIER, date: '2026-01-15', name: 'Subvention', status: 'reconciled', createdAt: new Date() },
      { id: 2, fitid: 'FIT-SEPT', accountId: COMPTE_COURANT, amountCents: -DEPENSE_SEPTEMBRE, date: '2026-09-10', name: 'Assurance', status: 'reconciled', createdAt: new Date() }
    ]);

    await db.insert(ledgerEntriesTable).values([
      {
        seasonId: 1, type: 'recette', accountId: COMPTE_COURANT, categoryId: CATEGORIE,
        amountCents: RECETTE_JANVIER, date: '2026-01-15', paymentMethodId: VIREMENT,
        description: 'Subvention municipale', status: 'cleared',
        bankStatementLineId: 1, createdAt: new Date()
      },
      {
        seasonId: 2, type: 'depense', accountId: COMPTE_COURANT, categoryId: CATEGORIE,
        amountCents: DEPENSE_SEPTEMBRE, date: '2026-09-10', paymentMethodId: VIREMENT,
        description: 'Assurance 26-27', status: 'cleared',
        bankStatementLineId: 2, createdAt: new Date()
      }
    ]);

    /*
     * Ce que la banque annonce : 1 500 € au 31 août, 1 450 € au 30 septembre après l'assurance.
     * Aucune de ces deux valeurs ne dépend de la comptabilité — c'est tout leur intérêt.
     */
    await db.insert(bankStatementBalancesTable).values([
      { accountId: COMPTE_COURANT, date: '2026-08-31', balanceCents: CLOTURE_25_26, createdAt: new Date() },
      { accountId: COMPTE_COURANT, date: '2026-09-30', balanceCents: CLOTURE_25_26 - DEPENSE_SEPTEMBRE, createdAt: new Date() }
    ]);
  });

  afterEach(() => vi.useRealTimers());

  const rapprochement = (seasonId: string) =>
    getReconciliationStatement(db, { accountCode: 'current', seasonId });

  /*
   * Le symptôme, tel qu'il se lit à l'écran.
   */
  it("affiche en écart toute la trésorerie d'ouverture tant que l'à-nouveau manque", async () => {
    const etat = await rapprochement('26-27');

    expect(etat.book.initialBalanceCents).toBe(0);
    // Le relevé annonce 1 450 €, les livres n'en reconstituent que −50 € : il manque l'ouverture.
    expect(etat.statement).toEqual({ date: '2026-09-30', balanceCents: CLOTURE_25_26 - DEPENSE_SEPTEMBRE });
    expect(etat.expectedBankBalanceCents).toBe(-DEPENSE_SEPTEMBRE);
    expect(etat.gapCents).toBe(CLOTURE_25_26);
    expect(etat.reconciled).toBe(false);

    /*
     * Et l'écart n'est imputable à aucun des décalages que l'écran sait nommer : ni écriture
     * non pointée, ni ligne non comptabilisée, ni virement à moitié pointé. C'est ce qui le
     * rend illisible pour le trésorier — le montant apparaît sans cause affichée.
     */
    expect(etat.unpointedEntries).toHaveLength(0);
    expect(etat.unrecordedBankLines).toHaveLength(0);
    expect(etat.halfPointedTransferIds).toHaveLength(0);
  });

  /*
   * L'exercice qui se termine, lui, se rapproche toujours correctement : son à-nouveau à lui
   * existe. C'est bien la bascule qui casse, pas le calcul.
   */
  it("laisse l'exercice précédent se rapprocher sans écart", async () => {
    const etat = await rapprochement('25-26');

    expect(etat.book.initialBalanceCents).toBe(A_NOUVEAU_25_26);
    expect(etat.gapCents).toBe(0);
    expect(etat.reconciled).toBe(true);
  });

  it("retombe à zéro dès qu'un à-nouveau provisoire est saisi", async () => {
    await updateSeasonBalances(db, '26-27', [
      { accountId: COMPTE_COURANT, initialBalanceCents: CLOTURE_25_26 }
    ]);

    const etat = await rapprochement('26-27');

    expect(etat.book.initialBalanceCents).toBe(CLOTURE_25_26);
    expect(etat.book.grossCents).toBe(CLOTURE_25_26 - DEPENSE_SEPTEMBRE);
    expect(etat.gapCents).toBe(0);
    expect(etat.reconciled).toBe(true);
  });

  it("accepte un à-nouveau provisoire sur la saison entrante, qui n'est pas clôturée", async () => {
    await expect(
      updateSeasonBalances(db, '26-27', [{ accountId: COMPTE_COURANT, initialBalanceCents: 1 }])
    ).resolves.not.toThrow();
  });

  /*
   * La clôture, quand les dernières charges d'août sont enfin arrivées.
   */
  describe('clôture de 25-26, une fois les charges reçues', () => {
    it('calcule le même à-nouveau que celui saisi à la main, et ne signale alors aucun écart', async () => {
      await updateSeasonBalances(db, '26-27', [
        { accountId: COMPTE_COURANT, initialBalanceCents: CLOTURE_25_26 }
      ]);

      const checks = await getCloseSeasonChecks(db, '25-26');

      expect(checks.canClose).toBe(true);
      expect(checks.nextSeasonCode).toBe('26-27');

      const courant = checks.balancesToRollover.find((b: any) => b.accountId === COMPTE_COURANT);
      expect(courant!.finalBalanceCents).toBe(CLOTURE_25_26);

      const existant = checks.existingInitialBalancesOnNextSeason!
        .find((b: any) => b.accountId === COMPTE_COURANT);
      expect(existant!.discrepancy).toBe(false);
    });

    /*
     * Le cas qui justifie la confirmation : le provisoire avait été estimé, la charge d'août
     * arrivée depuis l'a démenti. C'est le chemin normal, pas un accident — d'où le
     * `confirmOverwriteInitialBalances` que la clôture réclame.
     */
    it('refuse d\'écraser un à-nouveau provisoire faux sans confirmation explicite', async () => {
      await updateSeasonBalances(db, '26-27', [
        { accountId: COMPTE_COURANT, initialBalanceCents: 140_000 }
      ]);

      const checks = await getCloseSeasonChecks(db, '25-26');
      const existant = checks.existingInitialBalancesOnNextSeason!
        .find((b: any) => b.accountId === COMPTE_COURANT);

      expect(existant!.existingBalanceCents).toBe(140_000);
      expect(existant!.newBalanceCents).toBe(CLOTURE_25_26);
      expect(existant!.discrepancy).toBe(true);
      expect(checks.warnings.map((w: any) => w.code)).toContain('CASH_DISCREPANCY');

      await expect(closeSeason(db, { seasonId: '25-26' } as any))
        .rejects.toThrow('Confirmation explicite requise');
    });

    it("écrase le provisoire par le solde de clôture calculé, sur confirmation", async () => {
      await updateSeasonBalances(db, '26-27', [
        { accountId: COMPTE_COURANT, initialBalanceCents: 140_000 }
      ]);

      await closeSeason(db, {
        seasonId: '25-26',
        confirmOverwriteInitialBalances: true
      } as any);

      const reporte = await db.select().from(seasonBalancesTable).all();
      const courant26 = reporte.find((r: any) => r.seasonId === 2 && r.accountId === COMPTE_COURANT);
      expect(courant26!.initialBalanceCents).toBe(CLOTURE_25_26);

      // Et le rapprochement de 26-27 se referme, sans que personne ait saisi le bon chiffre.
      const etat = await rapprochement('26-27');
      expect(etat.gapCents).toBe(0);
      expect(etat.reconciled).toBe(true);
    });
  });

  /*
   * Le piège voisin, qui ne crée pas d'écart mais fait mentir l'en-tête : la date d'arrêté
   * retombe sur `getLatestBankStatementDate`, qui n'est **pas** bornée par la saison. Dès
   * qu'un relevé de septembre est importé, l'état de rapprochement de 25-26 s'étend au-delà
   * du 31 août sans le dire.
   */
  it("étend l'arrêté de 25-26 au-delà du 31 août dès qu'un relevé de septembre existe", async () => {
    const etat = await rapprochement('25-26');
    expect(etat.asOfDate).toBe('2026-09-30');
    expect(etat.asOfDate > '2026-08-31').toBe(true);
  });
});
