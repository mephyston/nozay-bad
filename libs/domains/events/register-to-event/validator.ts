import { Type } from '@sinclair/typebox';
import { MAX_GUESTS } from '../shared/event';

export const registerToEventSchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 }),
  firstName: Type.String({ minLength: 1, maxLength: 120 }),
  lastName: Type.String({ minLength: 1, maxLength: 120 }),
  email: Type.String({ minLength: 3, maxLength: 200 }),
  guests: Type.Optional(Type.Integer({ minimum: 0, maximum: MAX_GUESTS }))
});
