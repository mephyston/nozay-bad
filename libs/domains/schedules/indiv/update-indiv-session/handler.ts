import { type Db } from '@nba/db';
import { isValidDate } from '../../shared/open-play';
import { isValidLayout } from '../../shared/indiv';
import {
  IndivSessionNotFoundError,
  IndivSlotFullError,
  InvalidIndivLayoutError,
  InvalidSessionDateError,
  MissingCancellationReasonError,
  VenueNotFoundError
} from '../../shared/errors';
import { UpdateIndivSessionRepository } from './repository';
import type { UpdateIndivSessionInput, UpdateIndivSessionOutput } from './dto';

/**
 * Corriger une soirée, l'annuler, la rouvrir.
 *
 * Réduire le nombre de créneaux ou de places est refusé dès qu'une sélection existante
 * n'y tiendrait plus : l'entraîneur retire d'abord les retenus en trop, puis resserre.
 * L'inverse laisserait un candidat retenu sur un créneau qui n'existe plus.
 */
export async function updateIndivSession(
  db: Db,
  input: UpdateIndivSessionInput,
  now: Date = new Date()
): Promise<UpdateIndivSessionOutput> {
  const repo = new UpdateIndivSessionRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();

  if (input.date !== undefined && !isValidDate(input.date)) throw new InvalidSessionDateError();

  const layout = {
    startTime: input.startTime ?? session.startTime,
    slotCount: input.slotCount ?? session.slotCount,
    slotMinutes: input.slotMinutes ?? session.slotMinutes
  };
  if (!isValidLayout(layout)) throw new InvalidIndivLayoutError();

  if (input.venueId !== undefined && !(await repo.findVenue(db, input.venueId))) {
    throw new VenueNotFoundError();
  }

  const capacityPerSlot = input.capacityPerSlot ?? session.capacityPerSlot;
  if (layout.slotCount < session.slotCount || capacityPerSlot < session.capacityPerSlot) {
    const counts = await repo.selectionCounts(db, session.id);
    for (const [slot, count] of counts) {
      if (slot > layout.slotCount || count > capacityPerSlot) {
        throw new IndivSlotFullError('Des retenus occupent déjà les créneaux que vous voulez retirer.');
      }
    }
  }

  const values: Partial<typeof session> = { updatedAt: now };
  const assign = <K extends keyof UpdateIndivSessionInput>(key: K) => {
    if (input[key] !== undefined) (values as Record<string, unknown>)[key] = input[key];
  };
  (['date', 'venueId', 'startTime', 'slotCount', 'slotMinutes', 'capacityPerSlot', 'label', 'notes'] as const).forEach(assign);

  if (input.status === 'cancelled') {
    const reason = input.cancelledReason ?? session.cancelledReason;
    // Le candidat verra la soirée barrée : il doit lire pourquoi.
    if (!reason?.trim()) throw new MissingCancellationReasonError();
    values.status = 'cancelled';
    values.cancelledReason = reason.trim();
  } else if (input.status === 'open') {
    // Rouvrir efface le motif et rend la parole aux candidats : les retenus restent
    // marqués, l'entraîneur ré-annonce quand il le juge bon.
    values.status = 'open';
    values.cancelledReason = null;
  } else if (input.cancelledReason !== undefined) {
    values.cancelledReason = input.cancelledReason;
  }

  return repo.update(db, session.id, values);
}
