import { type Db } from '@nba/db';
import {
  IndivRequestNotFoundError,
  IndivSessionCancelledError,
  IndivSessionNotFoundError,
  IndivSlotFullError,
  InvalidIndivSlotError
} from '../../shared/errors';
import { listIndivCandidates } from '../list-indiv-candidates/handler';
import { SelectIndivRepository } from './repository';
import type { SelectIndivInput, SelectIndivOutput } from './dto';

/**
 * L'entraîneur retient : la sélection entière, remplacée en bloc.
 *
 * Trois vérifications, dans l'ordre : chaque candidature appartient à la soirée, le
 * créneau existe, le créneau a encore de la place. La préférence du candidat n'est
 * **pas** un refus — c'est un souhait, et l'entraîneur décide en connaissance de cause.
 *
 * Une soirée annoncée reste modifiable : un retenu qui se retire libère une place, et
 * l'entraîneur ré-annonce. Seule une soirée annulée est fermée.
 */
export async function selectIndiv(
  db: Db,
  input: SelectIndivInput,
  now: Date = new Date()
): Promise<SelectIndivOutput> {
  const repo = new SelectIndivRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();
  if (session.status === 'cancelled') throw new IndivSessionCancelledError();

  const known = new Set(await repo.requestIds(db, session.id));
  const perSlot = new Map<number, number>();
  const seen = new Set<number>();
  for (const pick of input.selection) {
    if (!known.has(pick.requestId) || seen.has(pick.requestId)) throw new IndivRequestNotFoundError();
    seen.add(pick.requestId);
    if (pick.slot < 1 || pick.slot > session.slotCount) throw new InvalidIndivSlotError();
    const count = (perSlot.get(pick.slot) ?? 0) + 1;
    if (count > session.capacityPerSlot) throw new IndivSlotFullError();
    perSlot.set(pick.slot, count);
  }

  // Un seul lot : remise à zéro puis une écriture par retenu. Deux à treize
  // instructions, loin des limites de D1, et un double-clic ne laisse jamais la soirée
  // à moitié sélectionnée.
  await db.batch(repo.buildReplaceStatements(db, session.id, input.selection, now) as any);

  return listIndivCandidates(db, { sessionId: session.id });
}
