import { Type } from '@sinclair/typebox';

export const updateCategorySchema = Type.Object({
  adminLabel: Type.Optional(Type.String()),
  adherentLabel: Type.Optional(Type.String()),
  hideInExpenses: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
  receiptCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  expenseCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  // Pôle et rubrique du tableau de bord ; null retire la catégorie de son regroupement.
  poleId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  rubriqueId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]))
});
