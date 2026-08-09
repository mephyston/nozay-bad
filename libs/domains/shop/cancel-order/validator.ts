import { Type } from '@sinclair/typebox';

export const cancelOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
