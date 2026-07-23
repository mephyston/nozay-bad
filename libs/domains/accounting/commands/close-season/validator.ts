import { Type } from '@sinclair/typebox';

export const closeSeasonParamSchema = Type.Object({
  id: Type.String({ minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' })
});
