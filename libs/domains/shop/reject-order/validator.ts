import { Type } from '@sinclair/typebox';

export const rejectOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
