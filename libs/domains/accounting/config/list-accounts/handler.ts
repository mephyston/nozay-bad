import { type Db } from '@nba/db';
import { ListAccountsRepository } from './repository';
import { ListAccountsOutput } from './dto';

/**
 * Les comptes de trésorerie du club, tels que les écrans doivent les proposer.
 *
 * Jusqu'ici aucune route ne les listait : chaque écran portait sa propre liste de trois codes,
 * et un compte ajouté en base n'existait pour personne. Le porte-monnaie Badnet est le premier.
 */
export async function listAccounts(db: Db): Promise<ListAccountsOutput> {
  const repo = new ListAccountsRepository();
  return repo.listAccounts(db);
}
