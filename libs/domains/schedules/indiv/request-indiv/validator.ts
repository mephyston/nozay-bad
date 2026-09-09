import { Type } from '@sinclair/typebox';
import { MAX_INDIV_NOTE_LENGTH, MAX_SLOT_COUNT } from '../../shared/indiv';

export const requestIndivSchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 }),
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  firstName: Type.String({ minLength: 1, maxLength: 120 }),
  lastName: Type.String({ minLength: 1, maxLength: 120 }),
  email: Type.String({ minLength: 3, maxLength: 200 }),
  memberGroup: Type.String({ maxLength: 120 }),
  preferredSlot: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: MAX_SLOT_COUNT }), Type.Null()])),
  note: Type.Optional(Type.Union([Type.String({ maxLength: MAX_INDIV_NOTE_LENGTH }), Type.Null()]))
});
