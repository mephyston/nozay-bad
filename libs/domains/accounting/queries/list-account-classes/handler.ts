import { ListAccountClassesRepository } from './repository';

export async function listAccountClasses(db: any) {
  const repo = new ListAccountClassesRepository();
  return repo.listAccountClasses(db);
}
