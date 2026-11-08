import { Type } from '@sinclair/typebox';

export const itemIdParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });

export const saveItemSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 60 }),
  priceCents: Type.Integer({ minimum: 0, maximum: 100000 }),
  active: Type.Optional(Type.Boolean()),
  sortOrder: Type.Optional(Type.Integer({ minimum: 0 })),
  /** Un pictogramme de la liste, ou `null` pour le deviner d'après le nom. */
  icon: Type.Optional(Type.Union([Type.String({ pattern: '^[a-z]{2,20}$' }), Type.Null()]))
});
