import { Type } from '@sinclair/typebox';
import { CHAMPIONSHIPS } from '../shared/championship';

const isoDate = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });

export const saveChampionshipDaysSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  championship: Type.Union(CHAMPIONSHIPS.map((c) => Type.Literal(c))),
  days: Type.Array(
    Type.Object({
      number: Type.Integer({ minimum: 1, maximum: 40 }),
      weekStart: isoDate,
      referenceEloDate: Type.Optional(Type.Union([isoDate, Type.Null()])),
      matchDate: Type.Optional(Type.Union([isoDate, Type.Null()])),
      kind: Type.Optional(Type.Union([Type.Literal('regular'), Type.Literal('playoff')])),
      label: Type.Optional(Type.Union([Type.String({ maxLength: 60 }), Type.Null()]))
    }),
    { maxItems: 40 }
  )
});
