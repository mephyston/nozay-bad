import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { pushSubscriptionsTable } from '../shared/schema';

export class UnsubscribeRepository {
  /**
   * La suppression est contrainte au couple (endpoint, email) : un compte ne peut
   * pas désabonner l'appareil d'un autre foyer en devinant un endpoint.
   */
  async removeByEndpoint(db: DbOrTx, email: string, endpoint: string): Promise<number> {
    const rows = await db
      .delete(pushSubscriptionsTable)
      .where(and(eq(pushSubscriptionsTable.endpoint, endpoint), eq(pushSubscriptionsTable.email, email)))
      .returning({ id: pushSubscriptionsTable.id });
    return rows.length;
  }
}
