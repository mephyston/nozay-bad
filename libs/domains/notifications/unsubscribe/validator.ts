import { Type } from '@sinclair/typebox';

export const unsubscribeBodySchema = Type.Object({
  email: Type.String({ minLength: 3, maxLength: 255, pattern: '^[^@\\s]+@[^@\\s]+$' }),
  endpoint: Type.String({ minLength: 12, maxLength: 1024 })
});
