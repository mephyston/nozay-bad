import { Type } from '@sinclair/typebox';

export const productCategorySchema = Type.Object({
  id: Type.Optional(Type.Number()),
  label: Type.String(),
  accountingCategoryId: Type.Number(),
  active: Type.Optional(Type.Boolean())
});

export const updateProductCategorySchema = Type.Object({
  label: Type.Optional(Type.String()),
  accountingCategoryId: Type.Optional(Type.Number()),
  active: Type.Optional(Type.Boolean())
});
