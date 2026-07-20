import { ListAccountClassesRepository } from './repository';
import { ListAccountClassesInput, ListAccountClassesOutput } from "./dto";

export async function listAccountClasses(db: any): Promise<ListAccountClassesOutput> {
  const repo = new ListAccountClassesRepository();
  return repo.listAccountClasses(db);
}
