import { Type } from '@sinclair/typebox';

export const deleteCategoryParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
