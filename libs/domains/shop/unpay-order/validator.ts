import { Type } from '@sinclair/typebox';

export const unpayOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
