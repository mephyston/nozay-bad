import { Type } from '@sinclair/typebox';

export const createOrderSchema = Type.Object({
  seasonId: Type.Integer({ minimum: 1 }),
  memberId: Type.Integer({ minimum: 1 }),
  productId: Type.Integer({ minimum: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  paymentMethodId: Type.Integer({ minimum: 1 }),
  paidAt: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
});
