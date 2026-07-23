import { Type } from '@sinclair/typebox';

export const updateSeasonBudgetSchema = Type.Array(
  Type.Object({
    categoryId: Type.Number(),
    type: Type.Union([Type.Literal('recette'), Type.Literal('depense')]),
    amount: Type.Number()
  })
);
