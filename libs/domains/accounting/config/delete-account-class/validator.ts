import { Type } from '@sinclair/typebox';

export const deleteAccountClassParamSchema = Type.Object({
  code: Type.String({ minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' })
});
