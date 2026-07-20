import { ListSeasonsRepository } from './repository';

export async function listSeasons(db: any) {
  const repo = new ListSeasonsRepository();
  return repo.listSeasons(db);
}
