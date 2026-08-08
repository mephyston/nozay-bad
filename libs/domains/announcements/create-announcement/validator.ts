import { Type } from '@sinclair/typebox';

/**
 * Le corps est plafonné généreusement : c'est du HTML, donc bien plus long que le texte
 * qu'il rend. La borne est là pour écarter un envoi aberrant, pas pour brider la rédaction.
 */
export const createAnnouncementSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  bodyHtml: Type.String({ minLength: 1, maxLength: 20000 }),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('published')]))
});
