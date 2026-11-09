import { Type } from '@sinclair/typebox';

export const openSessionSchema = Type.Object({
  openingFloatCents: Type.Integer({ minimum: 0, maximum: 1000000 }),
  /** La catégorie comptable de tout ce que la session vendra. */
  accountingCategoryId: Type.Integer({ minimum: 1 })
});

export const sessionCategorySchema = Type.Object({ accountingCategoryId: Type.Integer({ minimum: 1 }) });
