import { Type } from '@sinclair/typebox';

const DATETIME = '^\\d{4}-\\d{2}-\\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$';

export const EVENT_CATEGORIES = [
  'competition', 'interclubs', 'tournoi', 'stage', 'vie_du_club', 'assemblee'
] as const;

export const createEventSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  startsAt: Type.String({ pattern: DATETIME }),
  endsAt: Type.Optional(Type.String({ pattern: DATETIME })),
  allDay: Type.Optional(Type.Boolean()),
  category: Type.Union(EVENT_CATEGORIES.map((c) => Type.Literal(c))),
  venueLabel: Type.Optional(Type.String({ maxLength: 200 })),
  descriptionHtml: Type.Optional(Type.String({ maxLength: 20000 })),
  externalUrl: Type.Optional(Type.String({ maxLength: 500 }))
});
