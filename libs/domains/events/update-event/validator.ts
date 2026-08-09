import { Type } from '@sinclair/typebox';

const DATETIME = '^\\d{4}-\\d{2}-\\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$';

export const updateEventSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  startsAt: Type.Optional(Type.String({ pattern: DATETIME })),
  endsAt: Type.Optional(Type.Union([Type.String({ pattern: DATETIME }), Type.Null()])),
  venueLabel: Type.Optional(Type.Union([Type.String({ maxLength: 200 }), Type.Null()])),
  descriptionHtml: Type.Optional(Type.String({ maxLength: 20000 })),
  status: Type.Optional(
    Type.Union([Type.Literal('draft'), Type.Literal('published'), Type.Literal('cancelled')])
  )
});
