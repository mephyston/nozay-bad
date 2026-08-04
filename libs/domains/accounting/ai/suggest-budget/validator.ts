import { Type } from '@sinclair/typebox';

export const suggestBudgetSchema = Type.Object({
  report: Type.Any(),
  categories: Type.Array(Type.Any()),
  currentBudget: Type.Record(Type.String(), Type.Number()),
});
