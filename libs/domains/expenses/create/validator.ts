import { Type } from '@sinclair/typebox';
import { PIECES_MAX } from '../shared/justificatif';

export const createExpenseSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  category: Type.Union([Type.String(), Type.Integer()]),
  amount: Type.Integer({ minimum: 1 }),
  attachments: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { maxItems: PIECES_MAX })),
  // L'ancien justificatif unique : voir `CreateExpenseInput`.
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.String({ minLength: 1 }),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});
