import { Type } from '@sinclair/typebox';

export const updateScheduleSlotSchema = Type.Object({
  weekday: Type.Optional(Type.Integer({ minimum: 1, maximum: 7 })),
  startTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  endTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  label: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  coachName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  active: Type.Optional(Type.Boolean())
});
