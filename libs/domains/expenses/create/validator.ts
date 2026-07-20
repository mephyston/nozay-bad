import { Type } from '@sinclair/typebox';

export const createExpenseSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  category: Type.Union([Type.String(), Type.Integer()]),
  amount: Type.Integer({ minimum: 1 }),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.String({ minLength: 1 }),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});
