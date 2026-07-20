import { CreateSeasonRepository } from './repository';

export async function createSeason(db: any, body: { id: string; name: string; active?: boolean }) {
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
