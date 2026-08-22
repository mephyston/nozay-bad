import { type Db } from '@nba/db';
import { ListOpenPlayOpenersRepository } from './repository';
import type { ListOpenPlayOpenersInput, ListOpenPlayOpenersOutput } from './dto';

/**
 * Les détenteurs de badge de la saison.
 *
 * La liste ne porte que des licences : les noms sont résolus par l'écran qui les affiche,
 * seul à connaître l'annuaire. C'est ce qui empêche cette liste — courante, pas
 * historique — de conserver un prénom devenu faux.
 */
export async function listOpenPlayOpeners(
  db: Db,
  input: ListOpenPlayOpenersInput
): Promise<ListOpenPlayOpenersOutput> {
  const repo = new ListOpenPlayOpenersRepository();

  const [openers, opened] = await Promise.all([
    repo.list(db, input.seasonCode),
    repo.openedCounts(db, input.seasonCode)
  ]);

  return openers.map((opener) => ({
    ...opener,
    sessionsOpened: opened.get(opener.licence) ?? 0
  }));
}
