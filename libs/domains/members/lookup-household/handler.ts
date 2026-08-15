import { type Db } from '@nba/db';
import { LookupHouseholdRepository, type HouseholdLookupResult } from './repository';

export async function lookupHousehold(
  db: Db,
  identifier: string,
  today?: string
): Promise<HouseholdLookupResult> {
  const repo = new LookupHouseholdRepository();
  return repo.lookup(db, identifier, today);
}
