import { type Db } from '@nba/db';
import { ListPagesRepository } from './repository';
import type { ListPagesInput, ListPagesOutput } from './dto';

export async function listPages(db: Db, filters: ListPagesInput = {}): Promise<ListPagesOutput> {
  return new ListPagesRepository().list(db, filters.status);
}
