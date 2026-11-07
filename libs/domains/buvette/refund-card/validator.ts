import { Type } from '@sinclair/typebox';

export const refundCardSchema = Type.Object({
  clientId: Type.String({ pattern: '^[A-Za-z0-9-]{8,64}$' }),
  scanToken: Type.String({ minLength: 10, maxLength: 500 })
});
