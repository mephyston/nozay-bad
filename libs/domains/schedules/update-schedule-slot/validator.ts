import { Type } from '@sinclair/typebox';
import { AUDIENCES } from '../create-schedule-slot/validator';

export const updateScheduleSlotSchema = Type.Object({
  // Le gymnase et le groupe sont modifiables : une erreur de saisie sur l'un des deux
  // obligeait sinon à supprimer le créneau et à le ressaisir en entier.
  venueId: Type.Optional(Type.Integer({ minimum: 1 })),
  audience: Type.Optional(Type.Union(AUDIENCES.map((a) => Type.Literal(a)))),
  weekday: Type.Optional(Type.Integer({ minimum: 1, maximum: 7 })),
  startTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  endTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  label: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  coachName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  active: Type.Optional(Type.Boolean()),
  indiv: Type.Optional(Type.Boolean())
});
