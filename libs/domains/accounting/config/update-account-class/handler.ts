import { type Db } from '@nba/db';
import { UpdateAccountClassRepository } from './repository';
import { UpdateAccountClassCode, UpdateAccountClassInput, UpdateAccountClassOutput } from "./dto";

export async function updateAccountClass(db: Db, code: UpdateAccountClassCode, body: UpdateAccountClassInput): Promise<UpdateAccountClassOutput> {
  const repo = new UpdateAccountClassRepository();
  return repo.updateAccountClass(db, code, {
    label: body.label ? body.label.trim() : undefined,
    type: body.type
  } as any);
}
