import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteSettingsTable } from '../shared/schema';
import type { SaveSettingsInput } from './dto';

export class ManageSettingsRepository {
  save(db: DbOrTx, input: SaveSettingsInput) {
    const values = { ...input, updatedAt: new Date() };
    return db.insert(buvetteSettingsTable).values({ id: 1, ...values })
      .onConflictDoUpdate({ target: buvetteSettingsTable.id, set: values })
      .returning().get();
  }

  setCardPayments(db: DbOrTx, enabled: boolean) {
    return db.update(buvetteSettingsTable).set({ cardPaymentsEnabled: enabled, updatedAt: new Date() })
      .where(eq(buvetteSettingsTable.id, 1)).returning().get();
  }
}
