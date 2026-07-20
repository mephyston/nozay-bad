import { CreateAccountClassRepository } from './repository';

export async function createAccountClass(db: any, body: any) {
  const repo = new CreateAccountClassRepository();
  return repo.createAccountClass(db, {
    code: body.code.trim(),
    label: body.label.trim(),
    type: body.type,
    createdAt: new Date()
  });
}
