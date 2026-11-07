import { Type } from '@sinclair/typebox';

export const generatePaperCardsSchema = Type.Object({
  faceValueCents: Type.Union([Type.Literal(500), Type.Literal(1000)]),
  quantity: Type.Integer({ minimum: 1, maximum: 100 })
});
export const lookupPaperCardSchema = Type.Object({ code: Type.String({ minLength: 10, maxLength: 200 }) });
export const attachPaperCardSchema = Type.Object({
  deviceId: Type.String({ minLength: 8, maxLength: 64 }),
  code: Type.String({ minLength: 10, maxLength: 200 })
});
export const attachParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
