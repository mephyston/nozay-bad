import { Type } from '@sinclair/typebox';

export const saveSettingsSchema = Type.Object({
  maxBalanceCents: Type.Integer({ minimum: 100, maximum: 100000 }),
  cashPaymentMethodId: Type.Integer({ minimum: 1 }),
  prepaidPaymentMethodId: Type.Integer({ minimum: 1 }),
  gapCategoryId: Type.Integer({ minimum: 1 })
});
