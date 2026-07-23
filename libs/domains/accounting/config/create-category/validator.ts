import { Type } from '@sinclair/typebox';

export const createCategorySchema = Type.Object({
  adminLabel: Type.String({ minLength: 1 }),
  adherentLabel: Type.String({ minLength: 1 }),
  hideInExpenses: Type.Optional(Type.Boolean()),
  receiptCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  expenseCode: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
