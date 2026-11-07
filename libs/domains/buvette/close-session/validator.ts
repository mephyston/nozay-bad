import { Type } from '@sinclair/typebox';

export const closeSessionParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });

export const closeSessionSchema = Type.Object({
  countedCashCents: Type.Integer({ minimum: 0, maximum: 10000000 })
});
