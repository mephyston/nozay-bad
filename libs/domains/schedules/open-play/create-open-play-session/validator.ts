import { Type } from '@sinclair/typebox';

/**
 * Bornes de saisie d'une séance.
 *
 * `minPlayers` accepte 1 : un créneau peut n'attendre personne d'autre que son ouvreur
 * — le club en ouvre parfois pour un entraînement individuel. Le plafond à 40 n'est pas
 * une jauge de gymnase, c'est un garde-fou de frappe.
 */
export const createOpenPlaySessionSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 10 }),
  venueId: Type.Integer({ minimum: 1 }),
  date: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  startTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  endTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  minPlayers: Type.Optional(Type.Integer({ minimum: 1, maximum: 40 })),
  label: Type.Optional(Type.String({ maxLength: 120 })),
  notes: Type.Optional(Type.String({ maxLength: 500 }))
});
