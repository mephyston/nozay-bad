import { Type } from '@sinclair/typebox';
import { CHAMPIONSHIPS } from '../shared/championship';

export const saveChampionshipSettingsSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  championship: Type.Union(CHAMPIONSHIPS.map((c) => Type.Literal(c))),
  /** ISO `YYYY-MM-DD`, ou `null` pour dépingler. */
  referenceEloDate: Type.Optional(
    Type.Union([Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), Type.Null()])
  ),
  rulesUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  rulesLabel: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()]))
});
