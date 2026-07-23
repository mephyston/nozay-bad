import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { CreateInvoiceRepository } from './repository';
import { invoicesTable, invoiceItemsTable, seasonsTable } from '../../shared/schema';

describe('CreateInvoiceRepository', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    const existingSeason = await db.select().from(seasonsTable).all();
    if (!existingSeason.some(s => s.id === '25-26')) {
      await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 25-26', active: true, createdAt: new Date() }).run();
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
        seasonId: '25-26',
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Client A',
        totalAmount: 1000,
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
          seasonId: '25-26',
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client A',
          totalAmount: 1000,
          createdAt: new Date()
        },
        {
          invoiceNumber: 'FAC-2526-NBA91-0003',
          seasonId: '25-26',
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client B',
          totalAmount: 2000,
          createdAt: new Date()
        },
        {
          invoiceNumber: 'FAC-2526-NBA91-0005',
          seasonId: '25-26',
          date: '2026-07-22',
          dueDate: '2026-08-22',
          clientName: 'Client C',
          totalAmount: 3000,
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
        seasonId: '25-26',
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Client 3 Items',
        totalAmount: 6000,
        createdAt: new Date()
      };

      const items = [
        { description: 'Item 1', quantity: 2, unitPrice: 1000 },
        { description: 'Item 2', quantity: 1, unitPrice: 2000 },
        { description: 'Item 3', quantity: 4, unitPrice: 500 }
      ];

      const created = await repo.create(db, invoiceData, items);
      expect(created.id).toBeDefined();
      expect(created.invoiceNumber).toBe('FAC-2526-NBA91-0001');

      const savedItems = await db.select().from(invoiceItemsTable).all();
      expect(savedItems).toHaveLength(3);
      expect(savedItems[0]).toMatchObject({ description: 'Item 1', quantity: 2, unitPrice: 1000, totalPrice: 2000 });
      expect(savedItems[1]).toMatchObject({ description: 'Item 2', quantity: 1, unitPrice: 2000, totalPrice: 2000 });
      expect(savedItems[2]).toMatchObject({ description: 'Item 3', quantity: 4, unitPrice: 500, totalPrice: 2000 });
    });
  });
});
