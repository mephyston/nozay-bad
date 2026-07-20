import { Type } from '@sinclair/typebox';

export const createProductSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  category: Type.Union([
    Type.Literal('shuttlecock'),
    Type.Literal('string'),
    Type.Literal('other'),
  ]),
  price: Type.Integer({ minimum: 0 }),
  stock: Type.Integer({ minimum: 0 }),
  active: Type.Optional(Type.Boolean()),
});
