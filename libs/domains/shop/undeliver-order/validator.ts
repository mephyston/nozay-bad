import { Type } from '@sinclair/typebox';

export const undeliverOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
