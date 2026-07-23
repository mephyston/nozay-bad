import { type Db } from '@metacult/shared-db';
import { ListSeasonsRepository } from './repository';
import { ListSeasonsInput, ListSeasonsOutput } from "./dto";

export async function listSeasons(db: Db): Promise<ListSeasonsOutput> {
  const repo = new ListSeasonsRepository();
  return repo.listSeasons(db);
}
