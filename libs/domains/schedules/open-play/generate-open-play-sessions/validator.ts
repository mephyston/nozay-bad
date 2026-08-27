import { Type } from '@sinclair/typebox';

export const generateOpenPlaySessionsSchema = Type.Object({
  from: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  to: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  slotIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 50 })),
  minPlayers: Type.Optional(Type.Integer({ minimum: 1, maximum: 40 }))
});
