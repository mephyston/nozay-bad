import { Type } from '@sinclair/typebox';
import { RANKINGS } from '../shared/ranking';

/** Un classement connu, ou `null` pour « non compétiteur ». */
const ranking = Type.Optional(
  Type.Union([...RANKINGS.map((r) => Type.Literal(r)), Type.Null()])
);

/** Une cote CPPH est un entier positif, ou `null` quand elle n'est pas connue. */
const cpph = Type.Optional(Type.Union([Type.Integer({ minimum: 0, maximum: 10000 }), Type.Null()]));

export const saveRankingSchema = Type.Object({
  eloDate: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  singles: ranking,
  doubles: ranking,
  mixed: ranking,
  cpphSingles: cpph,
  cpphDoubles: cpph,
  cpphMixed: cpph
});
