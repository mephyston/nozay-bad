import { type Db } from '@nba/db';
import { DeleteOpenPlayOpenerRepository } from './repository';
import type { DeleteOpenPlayOpenerInput, DeleteOpenPlayOpenerOutput } from './dto';

/**
 * Reprend la clé d'un adhérent.
 *
 * Ne défait **rien du passé** : les séances qu'il a ouvertes gardent son nom, recopié au
 * moment où il s'est engagé. C'est toute la raison pour laquelle l'identité est recopiée
 * sur la séance et absente de cette liste-ci.
 *
 * Ne libère pas non plus les séances **à venir** qu'il tient déjà. Le retrait signifie
 * « ne lui en confie plus », pas « annule ce qu'il a promis » — et une séance qui
 * redeviendrait « à pourvoir » dans le dos de tout le monde ferait venir des gens devant
 * une porte close. Le bureau retire l'ouvreur séance par séance s'il le faut.
 *
 * Tolérant à l'absence, comme les autres suppressions du domaine.
 */
export async function deleteOpenPlayOpener(
  db: Db,
  input: DeleteOpenPlayOpenerInput
): Promise<DeleteOpenPlayOpenerOutput> {
  const repo = new DeleteOpenPlayOpenerRepository();
  return { removed: await repo.remove(db, input.openerId) };
}
