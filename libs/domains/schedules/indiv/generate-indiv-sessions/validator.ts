import { Type } from '@sinclair/typebox';
import { DATE_PATTERN, TIME_PATTERN, indivLayoutFields } from '../create-indiv-session/validator';

export const generateIndivSessionsSchema = Type.Object({
  from: Type.String({ pattern: DATE_PATTERN }),
  to: Type.String({ pattern: DATE_PATTERN }),
  slotIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 50 })),
  startTime: Type.Optional(Type.String({ pattern: TIME_PATTERN })),
  ...indivLayoutFields
});
