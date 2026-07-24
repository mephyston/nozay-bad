import { type Db } from '@nba/db';
import { CreateAccountClassRepository } from './repository';
import { CreateAccountClassInput, CreateAccountClassOutput } from "./dto";

export async function createAccountClass(db: Db, body: CreateAccountClassInput): Promise<CreateAccountClassOutput> {
  const repo = new CreateAccountClassRepository();
  return repo.createAccountClass(db, {
    code: Number(body.code) as any,
    label: body.label.trim(),
    type: (body.type || 'recette') as any,
    createdAt: new Date()
  });
}
