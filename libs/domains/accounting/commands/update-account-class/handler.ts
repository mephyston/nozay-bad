import { UpdateAccountClassRepository } from './repository';

export async function updateAccountClass(db: any, code: string, body: any) {
  const repo = new UpdateAccountClassRepository();
  return repo.updateAccountClass(db, code, {
    label: body.label?.trim(),
    type: body.type
  });
}
