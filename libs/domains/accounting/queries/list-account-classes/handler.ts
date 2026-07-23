import { type Db } from '@metacult/shared-db';
import { ListAccountClassesRepository } from './repository';
import { ListAccountClassesInput, ListAccountClassesOutput } from "./dto";
import { AccountClass } from '../../shared/account-class';

export async function listAccountClasses(db: Db): Promise<ListAccountClassesOutput> {
  const repo = new ListAccountClassesRepository();
  const accountClassesData = await repo.listAccountClasses(db);
  return accountClassesData.map((a) => new AccountClass(a)) as any;
}
