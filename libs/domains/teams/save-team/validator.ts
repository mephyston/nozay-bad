import { Type } from '@sinclair/typebox';
import { CHAMPIONSHIPS } from '../shared/championship';

export const saveTeamSchema = Type.Object({
  id: Type.Optional(Type.Integer({ minimum: 1 })),
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  championship: Type.Union(CHAMPIONSHIPS.map((c) => Type.Literal(c))),
  division: Type.String({ minLength: 1, maxLength: 10 }),
  // Vingt équipes dans un même championnat est très au-delà de ce qu'un club engage :
  // au-delà, c'est une faute de frappe, pas une intention.
  number: Type.Integer({ minimum: 1, maximum: 20 }),
  poolLabel: Type.Optional(Type.Union([Type.String({ maxLength: 40 }), Type.Null()])),
  active: Type.Optional(Type.Boolean())
});
