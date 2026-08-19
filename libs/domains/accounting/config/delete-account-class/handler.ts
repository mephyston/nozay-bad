import { type Db, AppError } from '@nba/db';
import { DeleteAccountClassRepository } from './repository';
import { DeleteAccountClassInput, DeleteAccountClassOutput } from "./dto";

export async function deleteAccountClass(db: Db, code: DeleteAccountClassInput): Promise<DeleteAccountClassOutput> {
  const repo = new DeleteAccountClassRepository();
  const isUsed = await repo.isAccountClassUsed(db, code);
  
  if (isUsed) {
    throw new AppError('Impossible de supprimer cette classe comptable car elle est rattachée à une ou plusieurs catégories.', 403);
  }
  
  return repo.deleteAccountClass(db, code);
}
