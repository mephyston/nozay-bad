import { eq } from 'drizzle-orm';
import { invoicesTable } from '../../shared/schema';

export class ListInvoicesRepository {
  async list(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, seasonId)).all();
  }
}
