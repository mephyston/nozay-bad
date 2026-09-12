import { Type } from '@sinclair/typebox';

export const listMembersQuerySchema = Type.Object({
  page: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
  search: Type.Optional(Type.String()),
  gender: Type.Optional(Type.String()),
  type: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  season: Type.Optional(Type.String()),
  paid: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')])),
  cohort: Type.Optional(Type.Union([Type.Literal('new'), Type.Literal('renewed'), Type.Literal('lapsed')]))
});
