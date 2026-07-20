import { Type } from '@sinclair/typebox';

export const updateExpenseSchema = Type.Object({
  seasonId: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  category: Type.Optional(Type.Union([Type.String(), Type.Integer()])),
  amount: Type.Optional(Type.Integer({ minimum: 1 })),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.Optional(Type.String({ minLength: 1 })),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});
