import { Type } from '@sinclair/typebox';
import { DISCIPLINES } from '../shared/ranking';

export const saveLineupSchema = Type.Object({
  slot: Type.Optional(Type.Integer({ minimum: 1, maximum: 2 })),
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  lines: Type.Array(
    Type.Object({
      discipline: Type.Union(DISCIPLINES.map((d) => Type.Literal(d))),
      position: Type.Integer({ minimum: 1, maximum: 6 }),
      licence1: Type.String({ minLength: 1, maxLength: 20 }),
      licence2: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()]))
    }),
    { maxItems: 12 }
  ),
  validate: Type.Optional(Type.Boolean())
});
