import { Type } from '@sinclair/typebox';

export const payOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
