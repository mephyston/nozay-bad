import { Type } from '@sinclair/typebox';

export const setExpenseAuthParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

export const setExpenseAuthBodySchema = Type.Object({
  authorized: Type.Boolean()
});
