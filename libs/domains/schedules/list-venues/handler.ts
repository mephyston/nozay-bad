import { type Db } from '@nba/db';
import { ListVenuesRepository } from './repository';
import type { ListVenuesOutput } from './dto';

export async function listVenues(db: Db): Promise<ListVenuesOutput> {
  return new ListVenuesRepository().list(db);
}
