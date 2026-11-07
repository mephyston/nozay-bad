import { Type } from '@sinclair/typebox';

export const openSessionSchema = Type.Object({
  openingFloatCents: Type.Integer({ minimum: 0, maximum: 1000000 })
});
