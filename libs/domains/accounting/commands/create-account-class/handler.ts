import { CreateAccountClassRepository } from './repository';
import { CreateAccountClassInput, CreateAccountClassOutput } from "./dto";

export async function createAccountClass(db: any, body: CreateAccountClassInput): Promise<CreateAccountClassOutput> {
  const repo = new CreateAccountClassRepository();
  return repo.createAccountClass(db, {
    code: body.code.trim(),
    label: body.label.trim(),
    type: body.type,
    createdAt: new Date()
  });
}
