import { Type } from '@sinclair/typebox';

export const saveFixtureDateSchema = Type.Object({
  slot: Type.Optional(Type.Integer({ minimum: 1, maximum: 2 })),
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  playedAt: Type.Union([
    Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$' }),
    Type.Null()
  ]),
  venue: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  opponent: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  confirmOutsideWeek: Type.Optional(Type.Boolean())
});
