import { Type } from '@sinclair/typebox';

export const deliverOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
