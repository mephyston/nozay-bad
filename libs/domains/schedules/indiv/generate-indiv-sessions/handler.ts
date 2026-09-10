import { type Db } from '@nba/db';
import { MAX_GENERATION_DAYS, datesInRange, daysBetween, isValidDate } from '../../shared/open-play';
import {
  DEFAULT_CAPACITY_PER_SLOT,
  DEFAULT_SLOT_COUNT,
  DEFAULT_SLOT_MINUTES,
  isValidLayout
} from '../../shared/indiv';
import {
  InvalidIndivLayoutError,
  InvalidSessionDateError,
  NoIndivSlotError,
  RangeTooWideError
} from '../../shared/errors';
import { GenerateIndivSessionsRepository } from './repository';
import type { GenerateIndivSessionsInput, GenerateIndivSessionsOutput } from './dto';

/**
 * Déroule les créneaux compétiteurs sur une période, une soirée d'indiv par occurrence.
 *
 * Même motif que la génération du jeu libre — Read-Decide-Write, et une clé naturelle qui
 * rend chaque insertion idempotente. L'entraîneur étend la période au fil de la saison
 * sans se souvenir de ce qu'il a déjà généré, et sans risquer d'effacer une soirée dont
 * les retenus sont annoncés.
 */
export async function generateIndivSessions(
  db: Db,
  input: GenerateIndivSessionsInput,
  now: Date = new Date()
): Promise<GenerateIndivSessionsOutput> {
  const repo = new GenerateIndivSessionsRepository();

  if (!isValidDate(input.from) || !isValidDate(input.to)) throw new InvalidSessionDateError();
  if (input.to < input.from) {
    throw new InvalidSessionDateError('La fin de période doit suivre son début.');
  }
  if (daysBetween(input.from, input.to) > MAX_GENERATION_DAYS) throw new RangeTooWideError();

  const slots = await repo.indivSlots(db, input.slotIds);
  if (slots.length === 0) throw new NoIndivSlotError();

  const slotCount = input.slotCount ?? DEFAULT_SLOT_COUNT;
  const slotMinutes = input.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const capacityPerSlot = input.capacityPerSlot ?? DEFAULT_CAPACITY_PER_SLOT;

  const rows = slots.flatMap((slot) => {
    const startTime = input.startTime ?? slot.startTime;
    // Vérifié créneau par créneau : une heure commune peut tenir sur l'un et déborder
    // minuit sur l'autre, en théorie du moins.
    if (!isValidLayout({ startTime, slotCount, slotMinutes })) throw new InvalidIndivLayoutError();

    return datesInRange(input.from, input.to, new Set([slot.weekday])).map((date) => ({
      venueId: slot.venueId,
      slotId: slot.id,
      date,
      startTime,
      slotCount,
      slotMinutes,
      capacityPerSlot,
      status: 'open' as const,
      label: slot.label,
      createdAt: now,
      updatedAt: now
    }));
  });

  let created = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const chunk = rows.slice(start, start + BATCH_SIZE);
    const results = await db.batch(chunk.map((row) => repo.buildInsert(db, row)) as any);
    created += results.reduce((total: number, result: any) => total + (result?.meta?.changes ?? 0), 0);
  }

  return { created, skipped: rows.length - created };
}

/** Loin sous les limites de D1 : onze colonnes par ligne, cinquante lignes par lot. */
const BATCH_SIZE = 50;
