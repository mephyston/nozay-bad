import { Type } from '@sinclair/typebox';

export const updateOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

export const updateOrderBodySchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 }),
  productId: Type.Integer({ minimum: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  paymentMethod: Type.String({ minLength: 1 })
});
