import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, ledgerEntriesTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteCardsTable } from './shared/schema';
import { getSettings } from './shared/queries.repository';
import { signCardToken } from './shared/card-tokens';
import { createItem } from './manage-items/handler';
import { saveSettings } from './manage-settings/handler';
import { openSession } from './open-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { closeSession } from './close-session/handler';
import { CloseSessionRepository } from './close-session/repository';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { maskEmail, scanCard } from './scan-card/handler';
import { refundCard } from './refund-card/handler';
import { openCard } from './open-card/handler';
import { deleteCard, getMovement, getWallet, issueQrToken, revokeOtherDevices } from './card-wallet/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';

describe('buvette', () => {
  let db: any;
  let coffee: { id: number };
  let sandwich: { id: number };
  let categoryId: number;

  async function cardWith(balanceCents: number, email = 'client@example.org') {
    const { cardId, deviceId } = await openCard(db, email);
    if (balanceCents) await db.update(buvetteCardsTable).set({ balanceCents }).where(eq(buvetteCardsTable.id, cardId));
    const { token } = await signCardToken(SECRET, 'scan', cardId, deviceId);
    return { cardId, deviceId, scanToken: token };
  }

  const balance = async (cardId: number) =>
    (await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, cardId)).get()).balanceCents;

  const sale = (clientId: string, values: Record<string, unknown>) =>
    createSale(db, SECRET, { clientId, lines: [], expectedCashCents: 0, createdByEmail: BY, ...values } as any);

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    categoryId = category.id;
    coffee = await createItem(db, { name: 'Café', priceCents: 100, accountingCategoryId: categoryId });
    sandwich = await createItem(db, { name: 'Sandwich', priceCents: 400, accountingCategoryId: categoryId });
  });

  describe('session de caisse', () => {
    it('la migration règle la buvette : une session s\'ouvre sans configuration', async () => {
      const session = await openSession(db, { openingFloatCents: 5000, openedByEmail: BY });
      expect(session.businessDate).toBe('2026-08-30');
    });

    it('une seule session ouverte à la fois', async () => {
      await openSession(db, { openingFloatCents: 0, openedByEmail: BY });
      await expect(openSession(db, { openingFloatCents: 0, openedByEmail: BY })).rejects.toThrow('déjà ouverte');
    });

    it('refuse d\'ouvrir hors de tout exercice', async () => {
      vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
      await expect(openSession(db, { openingFloatCents: 0, openedByEmail: BY })).rejects.toThrow('exercice');
      vi.setSystemTime(new Date('2026-08-30T12:00:00Z'));
    });

    it('refuse une caisse et un compte de dette identiques', async () => {
      const settings = await getSettings(db);
      await expect(saveSettings(db, {
        maxBalanceCents: 10000,
        cashPaymentMethodId: settings!.cashPaymentMethodId!,
        prepaidPaymentMethodId: settings!.cashPaymentMethodId!,
        cardPaymentMethodId: settings!.cardPaymentMethodId!,
        gapCategoryId: settings!.gapCategoryId!
      })).rejects.toThrow('trois comptes');
    });
  });

  describe('vente', () => {
    beforeEach(async () => {
      await openSession(db, { openingFloatCents: 5000, openedByEmail: BY });
    });

    it('paiement complet par carte', async () => {
      const card = await cardWith(1000);
      const { sale: paid } = await sale('vente-0001', { lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: card.scanToken });
      expect(paid.prepaidCents).toBe(400);
      expect(await balance(card.cardId)).toBe(600);
    });

    it('carte complétée par des espèces', async () => {
      const card = await cardWith(300);
      const { sale: paid } = await sale('vente-0002', {
        lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: card.scanToken, expectedCashCents: 100
      });
      expect(paid).toMatchObject({ prepaidCents: 300, cashCents: 100 });
      expect(await balance(card.cardId)).toBe(0);
    });

    it('la recharge ne se paie pas avec la carte', async () => {
      const card = await cardWith(1000);
      const { sale: paid } = await sale('vente-0003', {
        lines: [{ itemId: coffee.id, quantity: 1 }],
        rechargeCents: 2000,
        rechargeScanToken: card.scanToken,
        prepaidScanToken: card.scanToken,
        expectedCashCents: 2000
      });
      expect(paid).toMatchObject({ prepaidCents: 100, cashCents: 2000 });
      expect(await balance(card.cardId)).toBe(2900);
    });

    it('une double validation ne débite qu\'une fois', async () => {
      const card = await cardWith(1000);
      const values = { lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: card.scanToken };
      await sale('vente-0004', values);
      const second = await sale('vente-0004', values);
      expect(second.replayed).toBe(true);
      expect(await balance(card.cardId)).toBe(900);
    });

    it('un solde qui a bougé depuis l\'écran refuse la vente', async () => {
      const card = await cardWith(300);
      await db.update(buvetteCardsTable).set({ balanceCents: 200 }).where(eq(buvetteCardsTable.id, card.cardId));
      await expect(sale('vente-0005', {
        lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: card.scanToken, expectedCashCents: 100
      })).rejects.toThrow('solde');
      expect(await balance(card.cardId)).toBe(200);
    });

    it('le plafond de solde refuse une recharge', async () => {
      const card = await cardWith(9000);
      await expect(sale('vente-0006', {
        rechargeCents: 2000, rechargeScanToken: card.scanToken, expectedCashCents: 2000
      })).rejects.toThrow('plafond');
    });

    it('un appareil déconnecté ne peut plus payer', async () => {
      const card = await cardWith(1000);
      const other = await openCard(db, 'client@example.org');
      await revokeOtherDevices(db, card.cardId, other.deviceId);
      await expect(sale('vente-0007', {
        lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: card.scanToken
      })).rejects.toThrow('déconnecté');
      expect(await balance(card.cardId)).toBe(1000);
    });

    it('l\'annulation recrédite la carte, une seule fois', async () => {
      const card = await cardWith(1000);
      const { sale: paid } = await sale('vente-0008', { lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: card.scanToken });
      await cancelSale(db, { saleId: paid.id, cancelledByEmail: BY });
      expect(await balance(card.cardId)).toBe(1000);
      await expect(cancelSale(db, { saleId: paid.id, cancelledByEmail: BY })).rejects.toThrow('déjà annulée');
      expect(await balance(card.cardId)).toBe(1000);
    });

    it('une recharge déjà consommée ne s\'annule pas', async () => {
      const card = await cardWith(0);
      const { sale: charge } = await sale('vente-0009', { rechargeCents: 1000, rechargeScanToken: card.scanToken, expectedCashCents: 1000 });
      await sale('vente-0010', { lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: card.scanToken });
      await expect(cancelSale(db, { saleId: charge.id, cancelledByEmail: BY })).rejects.toThrow('consommée');
      expect(await balance(card.cardId)).toBe(600);
    });
  });

  describe('carte', () => {
    it('une adresse connue rouvre sa carte, quelle que soit la casse', async () => {
      const first = await openCard(db, 'Client@Example.org');
      const second = await openCard(db, 'client@example.org');
      expect(first.created).toBe(true);
      expect(second).toMatchObject({ cardId: first.cardId, created: false });
      expect(second.deviceId).not.toBe(first.deviceId);
    });

    it('le QR code se scanne, et le jeton de scan prend le relais', async () => {
      const card = await cardWith(1800);
      const { token } = await issueQrToken(db, SECRET, card.cardId, card.deviceId);
      const scanned = await scanCard(db, SECRET, token);
      expect(scanned).toMatchObject({ balanceCents: 1800, label: 'cl***@example.org' });
      await expect(scanCard(db, SECRET, scanned.scanToken)).rejects.toThrow('expiré');
    });

    it('un appareil déconnecté n\'obtient plus de QR code ni de solde', async () => {
      const a = await openCard(db, 'client@example.org');
      const b = await openCard(db, 'client@example.org');
      await revokeOtherDevices(db, a.cardId, a.deviceId);
      await expect(issueQrToken(db, SECRET, b.cardId, b.deviceId)).rejects.toThrow('déconnecté');
      await expect(getWallet(db, b.cardId, b.deviceId)).rejects.toThrow('déconnecté');
      expect((await getWallet(db, a.cardId, a.deviceId)).balanceCents).toBe(0);
    });

    it('une carte à zéro se supprime : l\'adresse part, l\'appareil se ferme', async () => {
      const a = await openCard(db, 'client@example.org');
      await deleteCard(db, a.cardId, a.deviceId);
      await expect(getWallet(db, a.cardId, a.deviceId)).rejects.toThrow('déconnecté');
      const row = await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, a.cardId)).get();
      expect(row.email).toBe(`supprime-${a.cardId}@carte.invalid`);
      expect((await openCard(db, 'client@example.org')).created).toBe(true);
    });

    it('le détail d\'une transaction montre les articles, et seulement à sa carte', async () => {
      await openSession(db, { openingFloatCents: 0, openedByEmail: BY });
      const c = await cardWith(300);
      await sale('vente-det-1', { lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 100 });
      const { deviceId } = await openCard(db, 'client@example.org');
      const [movement] = (await getWallet(db, c.cardId, deviceId)).movements;
      expect(await getMovement(db, c.cardId, deviceId, movement.id)).toMatchObject({
        type: 'debit', amountCents: -300, cashCents: 100, lines: [{ name: 'Sandwich', quantity: 1, unitPriceCents: 400 }]
      });
      const other = await openCard(db, 'autre@example.org');
      await expect(getMovement(db, other.cardId, other.deviceId, movement.id)).rejects.toThrow('introuvable');
    });

    it('une carte avec un solde ne se supprime pas', async () => {
      const c = await cardWith(100);
      const { deviceId } = await openCard(db, 'client@example.org');
      await expect(deleteCard(db, c.cardId, deviceId)).rejects.toThrow('solde');
    });

    it('masque l\'adresse', () => {
      expect(maskEmail('david@example.org')).toBe('da***@example.org');
    });
  });

  describe('remboursement', () => {
    beforeEach(async () => {
      await openSession(db, { openingFloatCents: 6000, openedByEmail: BY });
    });

    const refund = (scanToken: string, clientId = 'remb-0001') =>
      refundCard(db, SECRET, { clientId, scanToken, createdByEmail: BY });

    it('rend tout le solde et diminue les espèces théoriques', async () => {
      const card = await cardWith(1500);
      expect(await refund(card.scanToken)).toMatchObject({ amountCents: 1500, email: 'client@example.org', replayed: false });
      expect(await balance(card.cardId)).toBe(0);
      expect((await getCurrentSession(db))?.expectedCashCents).toBe(4500);
    });

    it('un rejeu ne sort pas d\'espèces une seconde fois', async () => {
      const card = await cardWith(1500);
      await refund(card.scanToken);
      expect(await refund(card.scanToken)).toMatchObject({ amountCents: 1500, replayed: true });
      expect((await getCurrentSession(db))?.expectedCashCents).toBe(4500);
    });

    it('une recharge arrivée entre la lecture et le lot reste sur la carte', async () => {
      const card = await cardWith(1500);
      const original = db.batch.bind(db);
      db.batch = async (statements: any) => {
        db.batch = original;
        await db.update(buvetteCardsTable).set({ balanceCents: 2000 }).where(eq(buvetteCardsTable.id, card.cardId));
        return original(statements);
      };
      expect((await refund(card.scanToken)).amountCents).toBe(1500);
      expect(await balance(card.cardId)).toBe(500);
    });

    it('refuse si la caisse n\'a pas assez d\'espèces', async () => {
      const card = await cardWith(7000);
      await expect(refund(card.scanToken)).rejects.toThrow("pas assez d'espèces");
      expect(await balance(card.cardId)).toBe(7000);
    });

    it('rien à rembourser sur une carte vide', async () => {
      const card = await cardWith(0);
      await expect(refund(card.scanToken)).rejects.toThrow('rien à rembourser');
    });
  });

  describe('clôture', () => {
    let sessionId: number;

    beforeEach(async () => {
      sessionId = (await openSession(db, { openingFloatCents: 5000, openedByEmail: BY })).id;
    });

    const close = (countedCashCents: number) => closeSession(db, { sessionId, countedCashCents, closedByEmail: BY });

    it('sans écart : les recettes par moyen, la recharge et le remboursement en virement', async () => {
      const card = await cardWith(0);
      await sale('vente-0101', { rechargeCents: 2000, rechargeScanToken: card.scanToken, expectedCashCents: 2000 });
      await sale('vente-0102', { lines: [{ itemId: coffee.id, quantity: 3 }], expectedCashCents: 300 });
      await sale('vente-0103', { lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: card.scanToken });
      await refundCard(db, SECRET, { clientId: 'remb-0101', scanToken: card.scanToken, createdByEmail: BY });

      const result = await close(5000 + 2000 + 300 - 1600);
      expect(result).toMatchObject({ gapCents: 0, itemsCashCents: 300, rechargeCashCents: 2000, prepaidCents: 400, refundsCents: 1600 });

      const entries = await db.select().from(ledgerEntriesTable).all();
      const recettes = entries.filter((e: any) => e.type === 'recette');
      expect(recettes.map((e: any) => e.amountCents).sort()).toEqual([300, 400]);
      expect(recettes.every((e: any) => e.categoryId === categoryId && e.date === '2026-08-30')).toBe(true);
      const legs = entries.filter((e: any) => e.type === 'transfert');
      expect(legs.map((e: any) => e.amountCents).sort()).toEqual([1600, 1600, 2000, 2000]);
      expect(entries.some((e: any) => e.type === 'depense')).toBe(false);
    });

    it('une recharge seule ne pose aucune recette', async () => {
      const card = await cardWith(0);
      await sale('vente-0201', { rechargeCents: 2000, rechargeScanToken: card.scanToken, expectedCashCents: 2000 });
      await close(7000);
      const entries = await db.select().from(ledgerEntriesTable).all();
      expect(entries.some((e: any) => e.type === 'recette')).toBe(false);
    });

    it('un manque en caisse devient une dépense, un excédent une recette', async () => {
      await sale('vente-0301', { lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 100 });
      expect((await close(4900)).gapCents).toBe(-200);
      const entries = await db.select().from(ledgerEntriesTable).all();
      expect(entries.find((e: any) => e.type === 'depense')).toMatchObject({ amountCents: 200 });
    });

    it('une session clôturée n\'encaisse plus et ne se clôture pas deux fois', async () => {
      await close(5000);
      await expect(close(5000)).rejects.toThrow('déjà clôturée');
      await expect(sale('vente-0401', { lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 100 })).rejects.toThrow('Aucune session');
      expect(await getCurrentSession(db)).toBeNull();
    });

    describe('écritures concurrentes', () => {
      afterEach(() => vi.restoreAllMocks());

      it('une vente qui passe pendant la clôture annule tout, et rien n\'est perdu', async () => {
        const original = CloseSessionRepository.prototype.paidSales;
        vi.spyOn(CloseSessionRepository.prototype, 'paidSales').mockImplementationOnce(async function (this: any, d: any, id: number) {
          const lues = await original.call(this, d, id);
          await sale('vente-0601', { lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 100 });
          return lues;
        });
        await expect(close(5000)).rejects.toThrow('pendant la clôture');
        expect(await db.select().from(ledgerEntriesTable).all()).toEqual([]);
        expect((await getCurrentSession(db))?.salesCount).toBe(1);
        expect((await close(5100)).gapCents).toBe(0);
      });

      it('une vente en espèces ne s\'annule plus une fois la session clôturée', async () => {
        const { sale: paid } = await sale('vente-0602', { lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 100 });
        await close(5100);
        await expect(cancelSale(db, { saleId: paid.id, cancelledByEmail: BY })).rejects.toThrow('clôturée');
      });
    });

    it('une vente annulée ne compte pas', async () => {
      const { sale: paid } = await sale('vente-0501', { lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 100 });
      await cancelSale(db, { saleId: paid.id, cancelledByEmail: BY });
      expect((await close(5000)).gapCents).toBe(0);
      expect(await db.select().from(ledgerEntriesTable).all()).toEqual([]);
    });
  });
});
