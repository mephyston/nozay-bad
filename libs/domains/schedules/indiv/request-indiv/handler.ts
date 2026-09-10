import { type Db } from '@nba/db';
import { isUpcomingDate } from '../../shared/open-play';
import { isIndivEligibleGroup } from '../../shared/indiv';
import {
  IndivSessionAnnouncedError,
  IndivSessionCancelledError,
  IndivSessionNotFoundError,
  IndivSessionPassedError,
  InvalidIndivSlotError,
  NotIndivEligibleError
} from '../../shared/errors';
import { RequestIndivRepository } from './repository';
import type { RequestIndivInput, RequestIndivOutput } from './dto';

/**
 * Un compétiteur demande sa place sur une soirée, ou précise sa demande.
 *
 * Les refus sont vérifiés **ici** et non à l'affichage, dans cet ordre : la soirée
 * n'existe pas, elle est annulée, ses retenus sont annoncés, elle est passée, le
 * demandeur n'est pas d'un groupe compétiteur, le créneau souhaité n'existe pas.
 *
 * Recandidater met à jour — préférence, mot, identité — et **ne touche jamais** à la
 * décision de l'entraîneur : un retenu qui change d'avis sur son créneau reste retenu.
 */
export async function requestIndiv(
  db: Db,
  input: RequestIndivInput,
  now: Date = new Date()
): Promise<RequestIndivOutput> {
  const repo = new RequestIndivRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();
  if (session.status === 'cancelled') throw new IndivSessionCancelledError();
  if (session.status === 'announced') throw new IndivSessionAnnouncedError();
  if (!isUpcomingDate(session.date, now)) throw new IndivSessionPassedError();
  if (!isIndivEligibleGroup(input.memberGroup)) throw new NotIndivEligibleError();

  const preferredSlot = input.preferredSlot ?? null;
  if (preferredSlot !== null && (preferredSlot < 1 || preferredSlot > session.slotCount)) {
    throw new InvalidIndivSlotError();
  }

  await repo.upsert(db, {
    sessionId: session.id,
    memberId: input.memberId,
    licence: input.licence.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    memberGroup: input.memberGroup.trim(),
    preferredSlot,
    note: input.note?.trim() || null,
    createdAt: now,
    updatedAt: now
  });

  // Relu plutôt que reconstitué : c'est la base qui a tranché entre insertion et mise à
  // jour, et l'appelant doit recevoir l'état réel — dont la décision déjà prise.
  const request = await repo.find(db, session.id, input.memberId);
  if (!request) throw new IndivSessionNotFoundError('La candidature n’a pas pu être relue.');
  return request;
}
