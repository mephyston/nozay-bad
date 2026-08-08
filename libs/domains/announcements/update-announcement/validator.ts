import { Type } from '@sinclair/typebox';

export const updateAnnouncementSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  bodyHtml: Type.String({ minLength: 1, maxLength: 20000 }),
  status: Type.Union([Type.Literal('draft'), Type.Literal('published')])
});
