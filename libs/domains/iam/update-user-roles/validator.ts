import { Type } from '@sinclair/typebox';
import { ROLES } from '../shared/roles';

export const updateUserBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  roles: Type.Optional(Type.Array(Type.Union(ROLES.map((r) => Type.Literal(r))), { maxItems: 5 }))
});
