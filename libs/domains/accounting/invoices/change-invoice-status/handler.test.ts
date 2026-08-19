import { describe, it, expect } from 'vitest';
import { changeInvoiceStatus } from './handler';
import { ChangeInvoiceStatusRepositoryInterface } from './repository';

class InMemoryChangeInvoiceStatusRepository implements ChangeInvoiceStatusRepositoryInterface {
  private invoices = new Map<number, any>();
  private closedSeasons = new Set<string>();

  constructor(initialInvoices: any[] = [], closedSeasons: string[] = []) {
    for (const invoice of initialInvoices) {
      this.invoices.set(invoice.id, invoice);
    }
    for (const seasonId of closedSeasons) {
      this.closedSeasons.add(seasonId);
    }
  }

  async getById(db: any, id: number): Promise<any | undefined> {
    return this.invoices.get(id);
  }

  async updateStatus(db: any, id: number, status: string): Promise<void> {
    const existing = this.invoices.get(id);
    if (existing) {
      this.invoices.set(id, { ...existing, status });
    }
  }

  async isSeasonClosed(db: any, seasonId: string): Promise<boolean> {
    return this.closedSeasons.has(seasonId);
  }
}

describe('changeInvoiceStatus', () => {
  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const repo = new InMemoryChangeInvoiceStatusRepository([
      { id: 1, seasonId: '25-26', status: 'draft' }
    ]);

    // Act
    await changeInvoiceStatus({} as any, 1, 'sent', repo);

    // Assert
    const invoice = await repo.getById({}, 1);
    expect(invoice?.status).toBe('sent');
  });

  it('should throw if status is invalid', async () => {
    // Arrange
    const repo = new InMemoryChangeInvoiceStatusRepository([]);

    // Act & Assert
    await expect(changeInvoiceStatus({} as any, 1, 'invalid_status' as any, repo)).rejects.toThrow();
  });

  it('should throw if invoice is not found', async () => {
    // Arrange
    const repo = new InMemoryChangeInvoiceStatusRepository([]);

    // Act & Assert
    await expect(changeInvoiceStatus({} as any, 1, 'sent', repo)).rejects.toThrow();
  });

  it('should throw if season is closed', async () => {
    // Arrange
    const repo = new InMemoryChangeInvoiceStatusRepository(
      [{ id: 1, seasonId: '25-26', status: 'draft' }],
      ['25-26']
    );

    // Act & Assert
    await expect(changeInvoiceStatus({} as any, 1, 'sent', repo)).rejects.toThrow('Saison clôturée');
  });
});
