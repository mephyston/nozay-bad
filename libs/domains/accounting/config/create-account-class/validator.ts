import { Type } from '@sinclair/typebox';

export const createAccountClassSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense')])
});
