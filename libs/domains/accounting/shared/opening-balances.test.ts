import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import {
  seasonsTable,
  seasonBalancesTable,
  ledgerEntriesTable,
  internalTransfersTable
} from './schema';
import { resolveOpeningBalances } from './opening-balances';
import { computeAccountBalance, signedEntryAmountCents, type AccountRef } from './balances';

/* Comptes semés par les migrations : 1 = courant, 2 = livret, 3 = caisse. */
const COURANT = 1;
const LIVRET = 2;
const CAISSE = 3;
const TOUS = [COURANT, LIVRET, CAISSE];
const VIREMENT = 1;
const CATEGORIE = 1;

const saison = (id: number, code: string, startDate: string, endDate: string) => ({
  id, code, name: `Saison ${code}`, startDate, endDate,
  active: false, closedAt: null, createdAt: new Date()
});

const ecriture = (over: Record<string, any>) => ({
  seasonId: 1, type: 'recette' as const, accountId: COURANT, categoryId: CATEGORIE,
  amountCents: 1_000, date: '2025-10-01', paymentMethodId: VIREMENT,
  description: 'Écriture', status: 'cleared' as const, createdAt: new Date(),
  ...over
});

describe('resolveOpeningBalances', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    await db.insert(seasonsTable).values([
      saison(1, '24-25', '2024-09-01', '2025-08-31'),
      saison(2, '25-26', '2025-09-01', '2026-08-31'),
      saison(3, '26-27', '2026-09-01', '2027-08-31')
    ]);
  });

  const ouverture = (seasonId: number, startDate: string, comptes = TOUS) =>
    resolveOpeningBalances(db, { id: seasonId, startDate }, comptes);

  /*
   * Le premier temps de la règle : un report écrit à la clôture fait autorité. On ne
   * recalcule pas à travers lui, même si les écritures antérieures disaient autre chose —
   * c'est la pièce d'ouverture, et l'intangibilité du bilan d'ouverture veut qu'elle tienne.
   */
  it("rend l'à-nouveau figé sans le recalculer", async () => {
    await db.insert(seasonBalancesTable).values({
      seasonId: 3, accountId: COURANT, initialBalanceCents: 150_000, createdAt: new Date()
    });
    // Une écriture antérieure qui contredirait le figé : elle ne doit pas être consultée.
    await db.insert(ledgerEntriesTable).values(ecriture({ seasonId: 2, amountCents: 99_999, date: '2026-05-01' }));

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    expect(res.byAccountId.get(COURANT)).toBe(150_000);
    expect(res.provisional).toBe(false);
  });

  /*
   * Le second temps : sans report figé, on calcule. C'est la situation d'un 1er septembre
   * quand l'exercice précédent n'est pas encore clôturé — l'état normal plusieurs mois par an.
   */
  it("calcule depuis le dernier point figé quand le report manque", async () => {
    await db.insert(seasonBalancesTable).values({
      seasonId: 2, accountId: COURANT, initialBalanceCents: 100_000, createdAt: new Date()
    });
    await db.insert(ledgerEntriesTable).values([
      ecriture({ seasonId: 2, type: 'recette', amountCents: 60_000, date: '2026-01-15' }),
      ecriture({ seasonId: 2, type: 'depense', amountCents: 10_000, date: '2026-03-20' })
    ]);

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    expect(res.byAccountId.get(COURANT)).toBe(150_000);
    expect(res.provisional).toBe(true);
  });

  /*
   * Une clôture écrit l'à-nouveau de tous les comptes d'un coup : le point figé est un
   * événement de bilan. Repartir du plus récent honore la dernière clôture — et si l'on
   * repartait du plus ancien en resommant tout, un report figé intermédiaire faux passerait
   * inaperçu.
   */
  it('repart du point figé le plus récent, pas du plus ancien', async () => {
    await db.insert(seasonBalancesTable).values([
      { seasonId: 1, accountId: COURANT, initialBalanceCents: 10_000, createdAt: new Date() },
      { seasonId: 2, accountId: COURANT, initialBalanceCents: 100_000, createdAt: new Date() }
    ]);
    // Une écriture de 24-25 : elle est DÉJÀ comprise dans le figé de 25-26, la recompter
    // reviendrait à la compter deux fois.
    await db.insert(ledgerEntriesTable).values([
      ecriture({ seasonId: 1, amountCents: 90_000, date: '2025-02-01' }),
      ecriture({ seasonId: 2, amountCents: 5_000, date: '2026-02-01' })
    ]);

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    expect(res.byAccountId.get(COURANT)).toBe(105_000);
  });

  /*
   * La coupure du 31 août. C'est elle qui rend le report exact : `close-season` borne ses
   * mouvements par les DATES de l'exercice, et l'ouverture du suivant reprend strictement
   * après. Les deux vues partitionnent le temps, sans recouvrement ni trou — un décalage d'un
   * jour ferait compter une écriture deux fois, ou pas du tout.
   */
  it("range l'écriture du dernier jour dans l'exercice qui se ferme", async () => {
    await db.insert(seasonBalancesTable).values({
      seasonId: 2, accountId: COURANT, initialBalanceCents: 0, createdAt: new Date()
    });
    await db.insert(ledgerEntriesTable).values([
      ecriture({ seasonId: 2, amountCents: 700, date: '2026-08-31' }),
      ecriture({ seasonId: 3, amountCents: 300, date: '2026-09-01' })
    ]);

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    // Le 31 août compte, le 1er septembre non.
    expect(res.byAccountId.get(COURANT)).toBe(700);
  });

  it("cumule depuis l'origine quand aucun report n'a jamais été figé", async () => {
    await db.insert(ledgerEntriesTable).values([
      ecriture({ seasonId: 1, amountCents: 4_000, date: '2024-10-01' }),
      ecriture({ seasonId: 2, amountCents: 1_000, date: '2025-12-01' })
    ]);

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    expect(res.byAccountId.get(COURANT)).toBe(5_000);
    expect(res.provisional).toBe(true);
  });

  it('rend zéro pour un compte sans report ni mouvement', async () => {
    const res = await ouverture(3, '2026-09-01', TOUS);

    expect(res.byAccountId.get(LIVRET)).toBe(0);
    expect(res.byAccountId.get(CAISSE)).toBe(0);
  });

  /*
   * Un report figé à zéro est traité comme absent, et se reconstitue donc lui aussi.
   *
   * La base ne distingue pas « délibérément vide » de « jamais renseigné » : les deux valent
   * `0`. C'était déjà la règle du bilan de trésorerie, et la changer ici ferait diverger les
   * écrans — ce que ce module existe précisément pour empêcher.
   */
  it("reconstitue aussi un report figé à zéro, que la base ne distingue pas d'un report absent", async () => {
    await db.insert(seasonBalancesTable).values([
      { seasonId: 2, accountId: COURANT, initialBalanceCents: 100_000, createdAt: new Date() },
      { seasonId: 3, accountId: COURANT, initialBalanceCents: 0, createdAt: new Date() }
    ]);
    await db.insert(ledgerEntriesTable).values(ecriture({ seasonId: 2, amountCents: 20_000, date: '2026-04-01' }));

    const res = await ouverture(3, '2026-09-01', [COURANT]);

    expect(res.byAccountId.get(COURANT)).toBe(120_000);
    expect(res.provisional).toBe(true);
  });

  it('rend à chaque compte son propre solde', async () => {
    await db.insert(seasonBalancesTable).values({
      seasonId: 2, accountId: COURANT, initialBalanceCents: 100_000, createdAt: new Date()
    });
    await db.insert(ledgerEntriesTable).values([
      ecriture({ seasonId: 2, accountId: COURANT, type: 'depense', amountCents: 30_000, date: '2026-02-01' }),
      ecriture({ seasonId: 2, accountId: CAISSE, type: 'recette', amountCents: 7_000, date: '2026-02-02' })
    ]);

    const res = await ouverture(3, '2026-09-01', TOUS);

    expect(res.byAccountId.get(COURANT)).toBe(70_000);
    expect(res.byAccountId.get(CAISSE)).toBe(7_000);
    expect(res.byAccountId.get(LIVRET)).toBe(0);
  });

  /*
   * Le garde-fou du doublon assumé.
   *
   * Le cumul se fait en SQL, sur un `SUM` groupé, pendant que le reste du domaine signe ses
   * montants en TypeScript avec `signedEntryAmountCents`. Deux implémentations de la même
   * règle : sans ce test, la première divergence de signe ne se verrait que sur un solde faux
   * en production, et rien ne dirait laquelle des deux a tort.
   *
   * Le jeu d'écritures couvre les quatre branches : recette, dépense, et les deux jambes d'un
   * virement interne, qui portent leur signe non par leur type mais par leur côté.
   */
  it('tient le signe SQL accordé à signedEntryAmountCents', async () => {
    await db.insert(internalTransfersTable).values({
      id: 1, seasonId: 2, reference: 'VIR-001', amountCents: 25_000,
      description: 'Courant vers livret', createdAt: new Date()
    });

    const ecritures = [
      ecriture({ seasonId: 2, type: 'recette', accountId: COURANT, amountCents: 80_000, date: '2026-01-05' }),
      ecriture({ seasonId: 2, type: 'depense', accountId: COURANT, amountCents: 12_500, date: '2026-01-06' }),
      ecriture({ seasonId: 2, type: 'recette', accountId: CAISSE, amountCents: 3_300, date: '2026-01-07' }),
      ecriture({ seasonId: 2, type: 'depense', accountId: CAISSE, amountCents: 1_100, date: '2026-01-08' }),
      ecriture({
        seasonId: 2, type: 'transfert', accountId: COURANT, categoryId: null,
        transferId: 1, transferLeg: 'source', amountCents: 25_000, date: '2026-02-10'
      }),
      ecriture({
        seasonId: 2, type: 'transfert', accountId: LIVRET, categoryId: null,
        transferId: 1, transferLeg: 'destination', amountCents: 25_000, date: '2026-02-11'
      })
    ];
    await db.insert(ledgerEntriesTable).values(ecritures);

    const res = await ouverture(3, '2026-09-01', TOUS);

    // La même chose, calculée par le chemin TypeScript du domaine.
    const lues = await db.select().from(ledgerEntriesTable).all();
    for (const id of TOUS) {
      const compte: AccountRef = { id, code: String(id) };
      const attendu = computeAccountBalance(compte, 0, lues).grossCents;
      expect(res.byAccountId.get(id), `compte ${id}`).toBe(attendu);
    }

    // Et la propriété qui fait tout l'objet du modèle à deux jambes : un virement interne ne
    // crée ni ne détruit de trésorerie.
    const virement = lues.filter((e: any) => e.transferId === 1);
    const total = TOUS.reduce(
      (somme, id) => somme + virement.reduce(
        (s: number, e: any) => s + signedEntryAmountCents(e, { id, code: String(id) }), 0
      ),
      0
    );
    expect(total).toBe(0);
  });
});
