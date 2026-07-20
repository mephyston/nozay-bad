import { ListSeasonsRepository } from './repository';
import { ListSeasonsInput, ListSeasonsOutput } from "./dto";

export async function listSeasons(db: any): Promise<ListSeasonsOutput> {
  const repo = new ListSeasonsRepository();
  return repo.listSeasons(db);
}
