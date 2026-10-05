import { Type } from '@sinclair/typebox';
import { CHAMPIONSHIPS } from '../shared/championship';

export const saveChampionshipRostersSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  championship: Type.Union(CHAMPIONSHIPS.map((c) => Type.Literal(c))),
  rosters: Type.Array(
    Type.Object({
      teamId: Type.Integer({ minimum: 1 }),
      licences: Type.Array(Type.String({ minLength: 1, maxLength: 20 }), { maxItems: 120 })
    }),
    { minItems: 1, maxItems: 20 }
  )
});
