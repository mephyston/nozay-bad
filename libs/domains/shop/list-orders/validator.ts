import { Type } from '@sinclair/typebox';

export const listOrdersQuerySchema = Type.Object({
  seasonId: Type.Optional(Type.Integer({ minimum: 1 })),
  status: Type.Optional(Type.String()),
  memberId: Type.Optional(Type.String({ pattern: '^[0-9]+$' }))
});
