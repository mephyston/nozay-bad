import { type Db } from '@metacult/shared-db';
import { DeleteAccountClassRepository } from './repository';
import { DeleteAccountClassInput, DeleteAccountClassOutput } from "./dto";

export async function deleteAccountClass(db: Db, code: DeleteAccountClassInput): Promise<DeleteAccountClassOutput> {
  const repo = new DeleteAccountClassRepository();
  return repo.deleteAccountClass(db, code);
}
