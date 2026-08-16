import { type DbOrTx } from '@nba/db';
import { TeamNotFoundError } from '../shared/errors';
import { DeleteTeamRepository } from './repository';

const repo = new DeleteTeamRepository();

export async function deleteTeam(db: DbOrTx, id: number): Promise<{ id: number }> {
  const team = await repo.findById(db, id);
  if (!team) throw new TeamNotFoundError();

  await repo.remove(db, id);
  return { id };
}
