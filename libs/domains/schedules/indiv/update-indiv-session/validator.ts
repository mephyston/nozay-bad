import { Type } from '@sinclair/typebox';
import { DATE_PATTERN, TIME_PATTERN, indivLayoutFields } from '../create-indiv-session/validator';

export const updateIndivSessionSchema = Type.Object({
  date: Type.Optional(Type.String({ pattern: DATE_PATTERN })),
  venueId: Type.Optional(Type.Integer({ minimum: 1 })),
  startTime: Type.Optional(Type.String({ pattern: TIME_PATTERN })),
  ...indivLayoutFields,
  label: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  notes: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  status: Type.Optional(Type.Union([Type.Literal('open'), Type.Literal('cancelled')])),
  cancelledReason: Type.Optional(Type.Union([Type.String({ maxLength: 300 }), Type.Null()]))
});
