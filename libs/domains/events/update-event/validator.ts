import { Type } from '@sinclair/typebox';
import { EVENT_CATEGORIES } from '../create-event/validator';

const DATETIME = '^\\d{4}-\\d{2}-\\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$';

export const updateEventSchema = Type.Object({
  // La catégorie est modifiable : elle ne conditionne ni l'adresse ni le slug, et une
  // erreur de saisie obligeait sinon à recréer la fiche.
  category: Type.Optional(Type.Union(EVENT_CATEGORIES.map((c) => Type.Literal(c)))),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  startsAt: Type.Optional(Type.String({ pattern: DATETIME })),
  endsAt: Type.Optional(Type.Union([Type.String({ pattern: DATETIME }), Type.Null()])),
  venueLabel: Type.Optional(Type.Union([Type.String({ maxLength: 200 }), Type.Null()])),
  descriptionHtml: Type.Optional(Type.String({ maxLength: 20000 })),
  status: Type.Optional(
    Type.Union([Type.Literal('draft'), Type.Literal('published'), Type.Literal('cancelled')])
  )
});
