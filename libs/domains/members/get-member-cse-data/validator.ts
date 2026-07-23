import { Type } from '@sinclair/typebox';

export const getMemberCseDataParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
