import { Type } from '@sinclair/typebox';

export const createCheckSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  number: Type.String({ minLength: 1 }),
  amount: Type.Number(),
  emitter: Type.String({ minLength: 1 }),
  bank: Type.Optional(Type.String()),
  memberId: Type.Optional(Type.Number()),
  category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  description: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
  photoUrl: Type.Optional(Type.String())
});
