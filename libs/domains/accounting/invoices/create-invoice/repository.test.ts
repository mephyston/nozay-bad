import { seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { CreateInvoiceRepository } from './repository';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

describe('CreateInvoiceRepository', () => {
  let db: any;
  let seasonIdNum = 1;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    const existingSeason = await db.select().from(seasonsTable).all();
    if (existingSeason.length > 0) {
      seasonIdNum = existingSeason[0].id;
    } else {
      const res = await db.insert(seasonsTable).values({ code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() }).returning().get();
      seasonIdNum = res.id;
    }
  });

  describe('generateInvoiceNumber', () => {
    it('should generate 0001 when 0 existing invoices', async () => {
      const repo = new CreateInvoiceRepository();
      const num = await repo.generateInvoiceNumber(db, '25-26');
      expect(num).toBe('FAC-2526-NBA91-0001');
    });

    it('should generate 0002 when 1 existing invoice exists', async () => {
      await db.insert(invoicesTable).values({
        invoiceNumber: 'FAC-2526-NBA91-0001',
        seasonId: seasonIdNum,
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Client A',
        totalAmountCents: 100000,
        createdAt: new Date()
      }).run();

      const repo = new CreateInvoiceRepository();
      const num = await repo.generateInvoiceNumber(db, '25-26');
      expect(num).toBe('FAC-2526-NBA91-0002');
    });

    it('should generate next number when n existing invoices exist (max sequence)', async () => {
      await db.insert(invoicesTable).values([
        {
          invoiceNumber: 'FAC-2526-NBA91-0001',
          seasonId: seasonIdNum,
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client A',
          totalAmountCents: 100000,
          createdAt: new Date()
        },
        {
          invoiceNumber: 'FAC-2526-NBA91-0003',
          seasonId: seasonIdNum,
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client B',
          totalAmountCents: 200000,
          createdAt: new Date()
        },
        {
          invoiceNumber: 'FAC-2526-NBA91-0005',
          seasonId: seasonIdNum,
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client C',
          totalAmountCents: 300000,
          createdAt: new Date()
        }
      ]).run();

      const repo = new CreateInvoiceRepository();
      const num = await repo.generateInvoiceNumber(db, '25-26');
      expect(num).toBe('FAC-2526-NBA91-0006');
    });
  });

  describe('create', () => {
    it('should insert invoice and 3 items in a single bulk call', async () => {
      const repo = new CreateInvoiceRepository();
      const invoiceData = {
        invoiceNumber: 'FAC-2526-NBA91-0001',
        seasonId: seasonIdNum,
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Client 3 Items',
        totalAmountCents: 600000,
        createdAt: new Date()
      };

      const items = [
        { description: 'Item 1', quantity: 2, unitPriceCents: 100000 },
        { description: 'Item 2', quantity: 1, unitPriceCents: 200000 },
        { description: 'Item 3', quantity: 4, unitPriceCents: 50000 }
      ];

      const created = await repo.create(db, invoiceData, items);
      expect(created.id).toBeDefined();
      expect(created.invoiceNumber).toBe('FAC-2526-NBA91-0001');

      const savedItems = await db.select().from(invoiceItemsTable).all();
      expect(savedItems).toHaveLength(3);
      expect(savedItems[0]).toMatchObject({ description: 'Item 1', quantity: 2, unitPriceCents: 100000, totalPriceCents: 200000 });
      expect(savedItems[1]).toMatchObject({ description: 'Item 2', quantity: 1, unitPriceCents: 200000, totalPriceCents: 200000 });
      expect(savedItems[2]).toMatchObject({ description: 'Item 3', quantity: 4, unitPriceCents: 50000, totalPriceCents: 200000 });
    });
  });

  describe('buildCreateStatements', () => {
    it('should attach every item to the new invoice, even when item ids have drifted ahead of invoice ids', async () => {
      // Une facture déjà en base avec plusieurs lignes : les id d'invoice_items
      // dépassent ceux d'invoices, si bien qu'un rattachement erroné ne peut plus
      // tomber par hasard sur un id de facture existant.
      const repo = new CreateInvoiceRepository();
      const previous = await db.insert(invoicesTable).values({
        invoiceNumber: 'FAC-2526-NBA91-0001',
        seasonId: seasonIdNum,
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Client précédent',
        totalAmountCents: 100000,
        createdAt: new Date()
      }).returning().get();
      await db.insert(invoiceItemsTable).values(
        [1, 2, 3].map((n) => ({
          invoiceId: previous.id,
          description: `Ancienne ligne ${n}`,
          quantity: 1,
          unitPriceCents: 1000,
          totalPriceCents: 1000,
          createdAt: new Date()
        }))
      ).run();

      const statements = repo.buildCreateStatements(
        db,
        {
          invoiceNumber: 'FAC-2526-NBA91-0002',
          seasonId: seasonIdNum,
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client 3 Items',
          totalAmountCents: 600000,
          createdAt: new Date()
        },
        [
          { description: 'Item 1', quantity: 2, unitPriceCents: 100000 },
          { description: 'Item 2', quantity: 1, unitPriceCents: 200000 },
          { description: 'Item 3', quantity: 4, unitPriceCents: 50000 }
        ]
      );

      await db.batch(statements as any);

      const created = await db.select().from(invoicesTable).where(eq(invoicesTable.invoiceNumber, 'FAC-2526-NBA91-0002')).get();
      const savedItems = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, created.id)).all();
      expect(savedItems.map((i: any) => i.description)).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });
  });
});
