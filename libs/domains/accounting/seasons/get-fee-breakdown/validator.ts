import { Type } from '@sinclair/typebox';

export const getFeeBreakdownQuerySchema = Type.Object({
  seasonId: Type.Optional(Type.String({ pattern: '^[0-9]{2}-[0-9]{2}$' }))
});
