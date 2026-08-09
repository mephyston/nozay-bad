import { Type } from '@sinclair/typebox';
export const savePostCategorySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 96 })),
  description: Type.Optional(Type.String({ maxLength: 300 }))
});
