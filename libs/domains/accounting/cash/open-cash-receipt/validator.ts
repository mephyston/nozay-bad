import { Type } from '@sinclair/typebox';

export const openCashReceiptSchema = Type.Object({
  payerMemberId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  payerName: Type.Optional(Type.String({ maxLength: 120 })),
  payerEmail: Type.Optional(Type.Union([Type.String({ pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', maxLength: 200 }), Type.Null()])),
  amountCents: Type.Integer({ minimum: 1, maximum: 1_000_000 }),
  categoryId: Type.Integer({ minimum: 1 }),
  description: Type.Optional(Type.String({ maxLength: 300 })),
  collectorName: Type.String({ minLength: 1, maxLength: 120 })
});
