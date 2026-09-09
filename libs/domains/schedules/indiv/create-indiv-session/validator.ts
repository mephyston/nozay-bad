import { Type } from '@sinclair/typebox';
import { MAX_CAPACITY_PER_SLOT, MAX_SLOT_COUNT, MAX_SLOT_MINUTES } from '../../shared/indiv';

/**
 * Bornes de saisie d'une soirée. Le validateur tient les bornes, le handler tient ce
 * qu'aucune borne ne dit : que la soirée finisse avant minuit.
 */
export const indivLayoutFields = {
  slotCount: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_SLOT_COUNT })),
  slotMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_SLOT_MINUTES })),
  capacityPerSlot: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_CAPACITY_PER_SLOT }))
};

export const TIME_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$';
export const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

export const createIndivSessionSchema = Type.Object({
  venueId: Type.Integer({ minimum: 1 }),
  date: Type.String({ pattern: DATE_PATTERN }),
  startTime: Type.String({ pattern: TIME_PATTERN }),
  ...indivLayoutFields,
  label: Type.Optional(Type.String({ maxLength: 120 })),
  notes: Type.Optional(Type.String({ maxLength: 500 }))
});
