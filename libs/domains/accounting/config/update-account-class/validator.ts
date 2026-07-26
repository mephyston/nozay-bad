import { Type } from '@sinclair/typebox';

export const updateAccountClassSchema = Type.Object({
  label: Type.Optional(Type.String()),
  type: Type.Optional(Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('tresorerie')]))
});
