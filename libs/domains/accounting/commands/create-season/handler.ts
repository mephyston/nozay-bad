import { CreateSeasonRepository } from './repository';
import { CreateSeasonInput, CreateSeasonOutput } from "./dto";

export async function createSeason(db: any, body: CreateSeasonInput): Promise<CreateSeasonOutput> {
  const repo = new CreateSeasonRepository();
  if (body.active) {
    await repo.deactivateAllSeasonsExcept(db);
  }
  return repo.createSeason(db, {
    id: body.id,
    name: body.name,
    active: body.active || false,
    createdAt: new Date()
  });
}
