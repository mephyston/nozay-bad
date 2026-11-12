import { Type } from '@sinclair/typebox';

const label = Type.String({ minLength: 1, maxLength: 80 });
const position = Type.Integer({ minimum: 0, maximum: 999 });

export const createCategoryGroupSchema = Type.Object({
  kind: Type.Union([Type.Literal('pole'), Type.Literal('rubrique')]),
  label,
  position: Type.Optional(position),
  membershipFees: Type.Optional(Type.Boolean())
});

export const updateCategoryGroupSchema = Type.Object({
  label: Type.Optional(label),
  position: Type.Optional(position),
  membershipFees: Type.Optional(Type.Boolean())
});
