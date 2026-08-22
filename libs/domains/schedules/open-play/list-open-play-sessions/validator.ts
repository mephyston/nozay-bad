import { Type } from '@sinclair/typebox';

export const listOpenPlaySessionsQuerySchema = Type.Object({
  season: Type.Optional(Type.String({ maxLength: 10 })),
  from: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  to: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  memberId: Type.Optional(Type.String()),
  licence: Type.Optional(Type.String({ maxLength: 20 })),
  includeCancelled: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String())
});
