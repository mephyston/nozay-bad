import { Type } from '@sinclair/typebox';

export const saveCalendarFeedBodySchema = Type.Object({
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  tokenHash: Type.String({ pattern: '^[0-9a-f]{64}$' })
});
