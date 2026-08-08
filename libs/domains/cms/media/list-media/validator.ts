import { Type } from '@sinclair/typebox';

export const listMediaQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  offset: Type.Optional(Type.String({ pattern: '^[0-9]{1,6}$' }))
});
