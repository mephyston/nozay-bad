import { UpdateAccountClassRepository } from './repository';
import { UpdateAccountClassCode, UpdateAccountClassInput, UpdateAccountClassOutput } from "./dto";

export async function updateAccountClass(db: any, code: UpdateAccountClassCode, body: UpdateAccountClassInput): Promise<UpdateAccountClassOutput> {
  const repo = new UpdateAccountClassRepository();
  return repo.updateAccountClass(db, code, {
    label: body.label?.trim(),
    type: body.type
  });
}
