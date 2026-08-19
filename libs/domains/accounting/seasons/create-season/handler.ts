import { type Db } from '@nba/db';
import { CreateSeasonRepository } from './repository';
import { CreateSeasonInput, CreateSeasonOutput } from "./dto";

export async function createSeason(db: Db, body: CreateSeasonInput): Promise<CreateSeasonOutput> {
  const repo = new CreateSeasonRepository();
  if (body.active) {
    await repo.deactivateAllSeasonsExcept(db);
  }
  const seasonCode = body.id || (body as any).code || '23-24';
  const [yy, zz] = seasonCode.split('-');
  const startDate = body.startDate || (yy ? `${2000 + parseInt(yy, 10)}-09-01` : '2023-09-01');
  const endDate = body.endDate || (zz ? `${2000 + parseInt(zz, 10)}-08-31` : '2024-08-31');

  return repo.createSeason(db, {
    code: seasonCode,
    name: body.name,
    startDate,
    endDate,
    active: body.active || false,
    createdAt: new Date()
  });
}
