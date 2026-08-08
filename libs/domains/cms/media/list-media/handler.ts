import { type Db } from '@nba/db';
import { ListMediaRepository } from './repository';
import type { ListMediaInput, ListMediaOutput } from './dto';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 60;

export async function listMedia(db: Db, filters: ListMediaInput = {}): Promise<ListMediaOutput> {
  return new ListMediaRepository().list(
    db,
    Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    filters.offset ?? 0
  );
}
