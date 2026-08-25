import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable, seasonBalancesTable, bankStatementBalancesTable } from '../../shared/schema';
import { getSeasonReports } from './handler';
import { createLedgerEntry } from '../../ledger/create-ledger-entry/handler';

/**
 * Le solde du relevé ne bouge sur aucune saisie.
 *
 * C'est la propriété que les écrans doivent rendre visible, et celle que la version précédente
 * ne tenait pas : ils affichaient sous le libellé « en banque » un nombre déduit des statuts,
 * qu'une recette saisie par virement — `cleared` par défaut — déplaçait aussitôt. Saisir une
 * écriture bougeait donc les deux soldes, alors que la banque, elle, n'avait rien vu.
 */
describe('solde du relevé dans le bilan de trésorerie', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    });
    await db.insert(seasonBalancesTable).values({
      seasonId: 1, accountId: 1, initialBalanceCents: 100_000, createdAt: new Date()
    });
  });

  const ligneCourant = (report: any) => report.bilanTrésorerie.find((b: any) => b.accountId === 'current');

  it("rend null tant qu'aucun relevé n'a été importé, plutôt qu'un solde bancaire calculé", async () => {
    const report = await getSeasonReports(db, '25-26');
    const ligne = ligneCourant(report);

    expect(ligne.finalBalance).toBe(100_000);
    expect(ligne.statementBalanceCents).toBeNull();
    expect(ligne.statementDate).toBeNull();
  });

  it('rend le dernier arrêté connu, avec sa date', async () => {
    await db.insert(bankStatementBalancesTable).values([
      { accountId: 1, date: '2026-01-12', balanceCents: 90_000, createdAt: new Date() },
      { accountId: 1, date: '2026-06-30', balanceCents: 123_400, createdAt: new Date() }
    ]);

    const ligne = ligneCourant(await getSeasonReports(db, '25-26'));
    expect(ligne.statementBalanceCents).toBe(123_400);
    expect(ligne.statementDate).toBe('2026-06-30');
  });

  it("ne retient pas un arrêté postérieur à la date d'arrêté demandée", async () => {
    await db.insert(bankStatementBalancesTable).values([
      { accountId: 1, date: '2026-01-12', balanceCents: 90_000, createdAt: new Date() },
      { accountId: 1, date: '2026-06-30', balanceCents: 123_400, createdAt: new Date() }
    ]);

    const ligne = ligneCourant(await getSeasonReports(db, { seasonId: '25-26', arretedAu: '2026-03-31' }));
    expect(ligne.statementBalanceCents).toBe(90_000);
    expect(ligne.statementDate).toBe('2026-01-12');
  });

  /*
   * La question posée telle quelle : une recette saisie et non rapprochée ne doit déplacer que
   * le solde comptable.
   */
  it("une écriture saisie déplace le solde comptable, jamais celui du relevé", async () => {
    await db.insert(bankStatementBalancesTable).values({
      accountId: 1, date: '2026-06-30', balanceCents: 100_000, createdAt: new Date()
    });

    const avant = ligneCourant(await getSeasonReports(db, '25-26'));
    expect(avant.finalBalance).toBe(100_000);
    expect(avant.statementBalanceCents).toBe(100_000);

    await createLedgerEntry(db, {
      seasonId: '1',
      type: 'recette',
      accountId: 'current',
      category: '1',
      amount: 1_000,
      date: '2026-07-01',
      paymentMethod: 'virement',
      description: 'Recette saisie, non rapprochée'
    } as any);

    const apres = ligneCourant(await getSeasonReports(db, '25-26'));
    expect(apres.finalBalance).toBe(101_000);
    expect(apres.statementBalanceCents).toBe(100_000);
    expect(apres.statementDate).toBe('2026-06-30');
  });

  it('laisse la caisse sans solde de relevé : elle n’a pas de banque', async () => {
    await db.insert(bankStatementBalancesTable).values({
      accountId: 1, date: '2026-06-30', balanceCents: 100_000, createdAt: new Date()
    });

    const report = await getSeasonReports(db, '25-26');
    const caisse = report.bilanTrésorerie.find((b: any) => b.accountId === 'cash');
    expect(caisse?.statementBalanceCents).toBeNull();
  });
});
