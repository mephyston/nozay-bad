import { Type } from '@sinclair/typebox';

export const getSeasonBalanceParamSchema = Type.Object({
  seasonId: Type.String({ minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' })
});
