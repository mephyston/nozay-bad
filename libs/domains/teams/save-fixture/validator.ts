import { Type } from '@sinclair/typebox';

export const saveFixtureSchema = Type.Object({
  dayId: Type.Integer({ minimum: 1 }),
  slot: Type.Optional(Type.Integer({ minimum: 1, maximum: 2 })),
  status: Type.Optional(
    Type.Union([Type.Literal('scheduled'), Type.Literal('bye'), Type.Literal('forfeit')])
  ),
  playedAt: Type.Optional(Type.Union([Type.String({ maxLength: 32 }), Type.Null()])),
  home: Type.Optional(Type.Boolean()),
  opponent: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  venue: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()]))
});
