import { DeleteAccountClassRepository } from './repository';
import { DeleteAccountClassInput, DeleteAccountClassOutput } from "./dto";

export async function deleteAccountClass(db: any, code: DeleteAccountClassInput): Promise<DeleteAccountClassOutput> {
  const repo = new DeleteAccountClassRepository();
  return repo.deleteAccountClass(db, code);
}
