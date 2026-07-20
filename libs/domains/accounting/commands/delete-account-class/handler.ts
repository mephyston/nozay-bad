import { DeleteAccountClassRepository } from './repository';

export async function deleteAccountClass(db: any, code: string) {
  const repo = new DeleteAccountClassRepository();
  return repo.deleteAccountClass(db, code);
}
