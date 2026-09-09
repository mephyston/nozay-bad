import { type Db } from '@nba/db';
import {
  IndivSessionCancelledError,
  IndivSessionNotFoundError,
  NoIndivSelectionError
} from '../../shared/errors';
import { AnnounceIndivRepository } from './repository';
import type { AnnounceIndivInput, AnnounceIndivOutput } from './dto';

/**
 * L'entraîneur rend sa décision publique.
 *
 * La soirée passe à `announced` — ce qui ferme les candidatures et fait compter les
 * retenus dans l'équité de la saison — et le handler rend les deux listes que l'appelant
 * prévient : retenus et non retenus. Le domaine ne notifie personne lui-même, il est
 * feuille : c'est `apps/api` qui compose avec les adhérents et les notifications.
 *
 * Pas de route ici, délibérément : la seule façon d'annoncer passe par ce composite, pour
 * qu'une annonce sans notification soit impossible.
 *
 * Ré-annoncer est permis. `announced_at` avance, et l'appelant en fait une version pour
 * ses envois — sans quoi la seconde annonce serait prise pour un doublon.
 */
export async function announceIndiv(
  db: Db,
  input: AnnounceIndivInput,
  now: Date = new Date()
): Promise<AnnounceIndivOutput> {
  const repo = new AnnounceIndivRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();
  if (session.status === 'cancelled') throw new IndivSessionCancelledError();

  const requests = await repo.requestsOf(db, session.id);
  const selected = requests.filter((r) => r.selectedSlot !== null);
  if (selected.length === 0) throw new NoIndivSelectionError();

  const announced = await repo.markAnnounced(db, session.id, now);

  return {
    session: announced,
    selected,
    declined: requests.filter((r) => r.selectedSlot === null),
    reannounced: session.status === 'announced'
  };
}
