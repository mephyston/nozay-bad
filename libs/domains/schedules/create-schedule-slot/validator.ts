import { Type } from '@sinclair/typebox';

export const AUDIENCES = [
  'minibad', 'poussins', 'jeunes', 'elite_jeunes',
  'adultes_loisir', 'adultes_competition', 'jeu_libre'
] as const;

export const createScheduleSlotSchema = Type.Object({
  venueId: Type.Integer({ minimum: 1 }),
  weekday: Type.Integer({ minimum: 1, maximum: 7 }),
  startTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  endTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  audience: Type.Union(AUDIENCES.map((a) => Type.Literal(a))),
  label: Type.Optional(Type.String({ maxLength: 120 })),
  coachName: Type.Optional(Type.String({ maxLength: 120 }))
});
