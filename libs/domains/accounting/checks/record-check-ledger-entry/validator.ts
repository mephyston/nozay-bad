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

/**
 * Modification d'un chèque reçu. La saison ne se change pas ici (elle est reprise du
 * chèque) ; `memberId: null` détache l'adhérent, `bank: null` efface la banque.
 */
export const updateCheckSchema = Type.Object({
  number: Type.String({ minLength: 1 }),
  amount: Type.Number(),
  emitter: Type.String({ minLength: 1 }),
  bank: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  memberId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  date: Type.String({ minLength: 1 })
});
