import { Type } from '@sinclair/typebox';

export const listChecksQuerySchema = Type.Object({
  season: Type.String({ minLength: 1 }),
  status: Type.Optional(Type.String())
});
