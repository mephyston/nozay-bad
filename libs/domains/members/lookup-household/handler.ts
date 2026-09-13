import { type Db } from '@nba/db';
import { getClubSettings, localDate } from '@nba/club/settings';
import { LookupHouseholdRepository, type HouseholdLookupResult } from './repository';

export async function lookupHousehold(
  db: Db,
  identifier: string,
  today?: string
): Promise<HouseholdLookupResult> {
  const repo = new LookupHouseholdRepository();
  // Le jour civil du club, dans son fuseau : le worker tourne en UTC, et s'en remettre à
  // lui ferait basculer la saison deux heures trop tard, le 31 août au soir.
  const day = today ?? localDate(new Date(), (await getClubSettings(db)).timezone);
  return repo.lookup(db, identifier, day);
}
