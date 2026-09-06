import { Type } from '@sinclair/typebox';

/** Les mêmes critères que la liste, sans pagination : l'export prend tout ce qui correspond. */
export const exportMembersQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
  gender: Type.Optional(Type.String()),
  type: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  season: Type.Optional(Type.String())
});
