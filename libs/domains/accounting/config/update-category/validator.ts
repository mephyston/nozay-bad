import { Type } from '@sinclair/typebox';

export const updateCategorySchema = Type.Object({
  adminLabel: Type.Optional(Type.String()),
  adherentLabel: Type.Optional(Type.String()),
  hideInExpenses: Type.Optional(Type.Boolean()),
  receiptCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  expenseCode: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
