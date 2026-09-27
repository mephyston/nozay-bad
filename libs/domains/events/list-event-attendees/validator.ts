import { Type } from '@sinclair/typebox';

export const listEventAttendeesParamSchema = Type.Object({
  id: Type.String({ pattern: '^[1-9][0-9]*$' })
});
