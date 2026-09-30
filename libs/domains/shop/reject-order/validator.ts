import { Type } from '@sinclair/typebox';
import { REJECTION_REASON_MAX_LENGTH } from '../shared/order';

export { REJECTION_REASON_MAX_LENGTH };

export const rejectOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

/**
 * Le corps est facultatif : un refus sans motif reste permis, comme avant. Seul le
 * motif y figure, et il est borné.
 */
export const rejectOrderBodySchema = Type.Object({
  reason: Type.Optional(Type.Union([Type.String({ maxLength: REJECTION_REASON_MAX_LENGTH }), Type.Null()]))
});
