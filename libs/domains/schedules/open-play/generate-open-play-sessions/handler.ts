import { type Db } from '@nba/db';
import {
  DEFAULT_MIN_PLAYERS,
  MAX_GENERATION_DAYS,
  datesInRange,
  daysBetween,
  isValidDate
} from '../../shared/open-play';
import {
  InvalidSessionDateError,
  NoOpenPlaySlotError,
  RangeTooWideError
} from '../../shared/errors';
import { GenerateOpenPlaySessionsRepository } from './repository';
import type { GenerateOpenPlaySessionsInput, GenerateOpenPlaySessionsOutput } from './dto';

/**
 * Déroule les créneaux récurrents de jeu libre sur une période.
 *
 * Motif Read-Decide-Write (ADR-0005) : on lit les créneaux, on calcule les dates en
 * mémoire — donc testable sans base — puis on écrit en lots.
 *
 * L'opération est **rejouable** : la clé naturelle de la séance rend chaque insertion
 * idempotente. Le bureau peut donc étendre la période au fil de la saison sans avoir à se
 * souvenir de ce qu'il a déjà généré, et sans risquer d'effacer une séance pourvue.
 */
export async function generateOpenPlaySessions(
  db: Db,
  input: GenerateOpenPlaySessionsInput,
  now: Date = new Date()
): Promise<GenerateOpenPlaySessionsOutput> {
  const repo = new GenerateOpenPlaySessionsRepository();

  // — Décision, avant même la lecture : ces refus ne coûtent aucune requête.
  if (!isValidDate(input.from) || !isValidDate(input.to)) throw new InvalidSessionDateError();
  if (input.to < input.from) {
    throw new InvalidSessionDateError('La fin de période doit suivre son début.');
  }
  // Sans borne, une faute de frappe sur l'année — « 2036 » pour « 2026 » — produirait des
  // milliers d'insertions et dépasserait les limites de D1.
  if (daysBetween(input.from, input.to) > MAX_GENERATION_DAYS) throw new RangeTooWideError();

  // — Lecture.
  const slots = await repo.openPlaySlots(db, input.seasonCode, input.slotIds);
  // Générer zéro séance en silence laisserait croire que l'opération a fonctionné.
  if (slots.length === 0) throw new NoOpenPlaySlotError();

  // — Décision : les lignes à écrire, en mémoire.
  const minPlayers = input.minPlayers ?? DEFAULT_MIN_PLAYERS;
  const rows = slots.flatMap((slot) =>
    datesInRange(input.from, input.to, new Set([slot.weekday])).map((date) => ({
      seasonCode: input.seasonCode,
      venueId: slot.venueId,
      slotId: slot.id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      minPlayers,
      status: 'open' as const,
      label: slot.label,
      createdAt: now,
      updatedAt: now
    }))
  );

  // — Écriture, par lots. Une saison entière de deux créneaux hebdomadaires dépasse la
  // centaine de lignes : on découpe, plutôt que d'espérer que D1 suive.
  let created = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const chunk = rows.slice(start, start + BATCH_SIZE);
    const results = await db.batch(chunk.map((row) => repo.buildInsert(db, row)) as any);
    // `meta.changes` plutôt que `.returning()` : une ligne ignorée ne rend rien, et sans
    // ce décompte le bureau rejouerait la génération en croyant qu'elle n'a rien fait.
    created += results.reduce(
      (total: number, result: any) => total + (result?.meta?.changes ?? 0),
      0
    );
  }

  return { created, skipped: rows.length - created };
}

/** Loin sous les limites de D1, et assez large pour qu'une saison tienne en peu d'allers-retours. */
const BATCH_SIZE = 50;
