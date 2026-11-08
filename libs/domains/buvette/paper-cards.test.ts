import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, ledgerEntriesTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteCardsTable } from './shared/schema';
import { createItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { closeSession } from './close-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { openCard } from './open-card/handler';
import { scanCard } from './scan-card/handler';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { refundCard } from './refund-card/handler';
import { attachPaperCard, generatePaperCards, lookupPaperCard } from './paper-cards/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';

describe('cartes papier', () => {
  let db: any;
  let coffee: any;
  let sessionId: number;
  let paper: { id: number; code: string };

  const row = (id: number) => db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, id)).get();
  const sell = async (card = paper) => {
    const { scanToken } = await scanCard(db, SECRET, card.code);
    return createSale(db, SECRET, { clientId: `vente-${card.id}`, lines: [], rechargeCents: 1000, rechargeScanToken: scanToken, expectedCashCents: 1000, createdByEmail: BY });
  };

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    coffee = await createItem(db, { name: 'Café', priceCents: 100 });
    sessionId = (await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category.id, openedByEmail: BY })).id;
    [paper] = await generatePaperCards(db, 1000, 1);
  });

  it('un lot n\'a aucune valeur avant la vente, et sa base ne garde pas le code', async () => {
    const lot = await generatePaperCards(db, 500, 3);
    expect(lot).toHaveLength(3);
    const stored = await row(lot[0].id);
    expect(stored).toMatchObject({ kind: 'paper', balanceCents: 0, paperStatus: 'new', email: null });
    expect(JSON.stringify(stored)).not.toContain(lot[0].code);
  });

  it('se vend à sa valeur faciale, puis paie comme une carte', async () => {
    await expect(createSale(db, SECRET, {
      clientId: 'vente-mauvaise', lines: [], rechargeCents: 500, rechargeScanToken: (await scanCard(db, SECRET, paper.code)).scanToken, expectedCashCents: 500, createdByEmail: BY
    })).rejects.toThrow('10 €');
    await sell();
    expect(await row(paper.id)).toMatchObject({ balanceCents: 1000, paperStatus: 'active' });

    const scan = await scanCard(db, SECRET, `https://buvette.test/carte/${paper.code}`);
    expect(scan).toMatchObject({ kind: 'paper', balanceCents: 1000, label: `Carte papier n° ${paper.id}` });
    await createSale(db, SECRET, { clientId: 'achat-1', lines: [{ itemId: coffee.id, quantity: 2 }], prepaidScanToken: scan.scanToken, expectedCashCents: 0, createdByEmail: BY });
    expect((await row(paper.id)).balanceCents).toBe(800);
  });

  it('une carte papier vendue ne se recharge plus', async () => {
    await sell();
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    await expect(createSale(db, SECRET, {
      clientId: 'vente-2', lines: [], rechargeCents: 1000, rechargeScanToken: scanToken, expectedCashCents: 1000, createdByEmail: BY
    })).rejects.toThrow('ne se recharge pas');
  });

  it('une vente annulée remet la carte à vendre', async () => {
    const { sale } = await sell();
    await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    expect(await row(paper.id)).toMatchObject({ balanceCents: 0, paperStatus: 'new' });
    expect((await sell({ ...paper })).replayed).toBe(true);
  });

  it('deux caisses qui vendent la même carte en même temps : une seule recharge passe', async () => {
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    const sale = (clientId: string) => createSale(db, SECRET, { clientId, lines: [], rechargeCents: 1000, rechargeScanToken: scanToken, expectedCashCents: 1000, createdByEmail: BY });
    const original = db.batch.bind(db);
    db.batch = async (statements: any) => {
      db.batch = original;
      await sale('autre-caisse');
      return original(statements);
    };
    await expect(sale('cette-caisse')).rejects.toThrow('autre caisse');
    expect((await row(paper.id)).balanceCents).toBe(1000);
  });

  it('une carte qui attend sa CB ne se vend pas une seconde fois', async () => {
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    const sale = (clientId: string) => createSale(db, SECRET, {
      clientId, lines: [], rechargeCents: 1000, rechargeScanToken: scanToken, expectedCashCents: 1000, createdByEmail: BY, payRestByCard: true
    });
    await sale('cb-papier-1');
    await expect(sale('cb-papier-2')).rejects.toThrow('attend sa CB');
    expect((await row(paper.id)).balanceCents).toBe(0);
  });

  it('une carte pas encore vendue ne paie rien', async () => {
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    await expect(createSale(db, SECRET, {
      clientId: 'achat-sans-vente', lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: scanToken, expectedCashCents: 100, createdByEmail: BY
    })).rejects.toThrow('pas encore été vendue');
  });

  it('une clôture passée pendant un remboursement l\'annule, sans sortie d\'espèces fantôme', async () => {
    await sell();
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    const original = db.batch.bind(db);
    db.batch = async (statements: any) => {
      db.batch = original;
      await closeSession(db, { sessionId, countedCashCents: 6000, closedByEmail: BY });
      return original(statements);
    };
    await expect(refundCard(db, SECRET, { clientId: 'remb-cloture', scanToken, createdByEmail: BY })).rejects.toThrow('clôturée');
    expect((await row(paper.id)).balanceCents).toBe(1000);
  });

  it('un code saisi sans tirets ni majuscules désigne la même carte', async () => {
    const typed = paper.code.replace(/-/g, ' ').toLowerCase();
    expect((await scanCard(db, SECRET, typed)).label).toContain(String(paper.id));
  });

  it('annuler une vente payée par une carte déjà remboursée rend des espèces, sans la recréditer', async () => {
    await sell();
    const { scanToken } = await scanCard(db, SECRET, paper.code);
    const sale = (await createSale(db, SECRET, { clientId: 'achat-papier', lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: scanToken, expectedCashCents: 0, createdByEmail: BY })).sale;
    await refundCard(db, SECRET, { clientId: 'remb-papier', scanToken, createdByEmail: BY });
    const cancelled = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    expect(cancelled).toMatchObject({ cardCreditedCents: 0, cashToReturnCents: 100 });
    expect((await row(paper.id)).balanceCents).toBe(0);
  });

  it('un code inconnu est refusé', async () => {
    await expect(scanCard(db, SECRET, 'BVP-AAAAA-AAAAA-AAAAA')).rejects.toThrow('introuvable');
  });

  describe('remboursement à la fin du tournoi', () => {
    it('rend le solde et ferme la carte : un second remboursement est impossible', async () => {
      await sell();
      const { scanToken } = await scanCard(db, SECRET, paper.code);
      expect(await refundCard(db, SECRET, { clientId: 'remb-papier-1', scanToken, createdByEmail: BY })).toMatchObject({ amountCents: 1000, email: null });
      expect(await row(paper.id)).toMatchObject({ balanceCents: 0, paperStatus: 'closed', paperClosedReason: 'refunded' });

      await expect(scanCard(db, SECRET, paper.code)).rejects.toThrow('déjà été remboursée');
      await expect(refundCard(db, SECRET, { clientId: 'remb-papier-2', scanToken, createdByEmail: BY })).rejects.toThrow('déjà été remboursée');
      expect((await getCurrentSession(db))?.expectedCashCents).toBe(5000);
    });

    it('un jeton de scan obtenu avant ne dépense plus une carte fermée', async () => {
      await sell();
      const { scanToken } = await scanCard(db, SECRET, paper.code);
      await refundCard(db, SECRET, { clientId: 'remb-papier-3', scanToken, createdByEmail: BY });
      await expect(createSale(db, SECRET, {
        clientId: 'achat-apres', lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: scanToken, expectedCashCents: 0, createdByEmail: BY
      })).rejects.toThrow('déjà été remboursée');
    });

    it('la clôture vire le remboursement comme pour une autre carte', async () => {
      await sell();
      const { scanToken } = await scanCard(db, SECRET, paper.code);
      await refundCard(db, SECRET, { clientId: 'remb-papier-4', scanToken, createdByEmail: BY });
      expect(await closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY })).toMatchObject({ gapCents: 0, rechargeCashCents: 1000, refundsCents: 1000 });
      const entries = await db.select().from(ledgerEntriesTable).all();
      expect(entries.every((e: any) => e.type === 'transfert')).toBe(true);
    });
  });

  describe('rattachement à un compte', () => {
    let client: { cardId: number; deviceId: string };

    beforeEach(async () => {
      client = await openCard(db, 'client@example.org');
    });

    it('transfère le solde, puis la carte papier ne vaut plus rien', async () => {
      await sell();
      expect(await attachPaperCard(db, client.cardId, client.deviceId, paper.code)).toEqual({ amountCents: 1000 });
      expect((await row(client.cardId)).balanceCents).toBe(1000);
      expect(await row(paper.id)).toMatchObject({ balanceCents: 0, paperStatus: 'closed', paperClosedReason: 'merged' });
      await expect(scanCard(db, SECRET, paper.code)).rejects.toThrow('transférée');
      await expect(attachPaperCard(db, client.cardId, client.deviceId, paper.code)).rejects.toThrow('transférée');
      expect((await row(client.cardId)).balanceCents).toBe(1000);
    });

    it('un remboursement passé entre la lecture et le lot ne crédite pas le compte', async () => {
      await sell();
      const { scanToken } = await scanCard(db, SECRET, paper.code);
      const original = db.batch.bind(db);
      db.batch = async (statements: any) => {
        db.batch = original;
        await refundCard(db, SECRET, { clientId: 'remb-course', scanToken, createdByEmail: BY });
        return original(statements);
      };
      await expect(attachPaperCard(db, client.cardId, client.deviceId, paper.code)).rejects.toThrow('vient de servir');
      expect((await row(client.cardId)).balanceCents).toBe(0);
      expect(await row(paper.id)).toMatchObject({ paperClosedReason: 'refunded', balanceCents: 0 });
    });

    it('une carte remboursée ne se rattache pas', async () => {
      await sell();
      const { scanToken } = await scanCard(db, SECRET, paper.code);
      await refundCard(db, SECRET, { clientId: 'remb-papier-5', scanToken, createdByEmail: BY });
      await expect(attachPaperCard(db, client.cardId, client.deviceId, paper.code)).rejects.toThrow('déjà été remboursée');
      expect((await row(client.cardId)).balanceCents).toBe(0);
    });

    it('une carte pas encore vendue ne se rattache pas', async () => {
      await expect(attachPaperCard(db, client.cardId, client.deviceId, paper.code)).rejects.toThrow('pas encore été vendue');
    });

    it('le plafond du compte s\'applique', async () => {
      await sell();
      await db.update(buvetteCardsTable).set({ balanceCents: 9500 }).where(eq(buvetteCardsTable.id, client.cardId));
      await expect(attachPaperCard(db, client.cardId, client.deviceId, paper.code)).rejects.toThrow('plafond');
      expect((await lookupPaperCard(db, paper.code)).status).toBe('active');
    });
  });
});
