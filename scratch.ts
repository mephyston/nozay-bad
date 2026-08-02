import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { ledgerEntriesTable, categoriesTable, seasonsTable } from './libs/domains/accounting/shared/schema';
import { lt } from 'drizzle-orm';

const client = createClient({ url: 'file:./.data/target_migrated.sqlite' });
const db = drizzle(client);

async function main() {
  const currentSeasonStartDate = '2026-09-01'; // 26-27 starts here
  
  const pastTransactions = await db.select()
    .from(ledgerEntriesTable)
    .where(lt(ledgerEntriesTable.date, currentSeasonStartDate))
    .all();

  console.log(`Total past txs: ${pastTransactions.length}`);
  
  const pcas = pastTransactions.filter(tx => tx.accrualType === 'produit_constate_avance');
  console.log(`Total PCAs in past txs: ${pcas.length}`);
  for (const pca of pcas) {
    console.log(pca);
  }
}

main().catch(console.error);
