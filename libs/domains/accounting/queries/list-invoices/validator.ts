import { Type } from '@sinclair/typebox';

export const listInvoicesQuerySchema = Type.Object({
  season: Type.String({ minLength: 1 })
});
