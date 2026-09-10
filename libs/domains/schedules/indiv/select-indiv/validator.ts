import { Type } from '@sinclair/typebox';
import { MAX_CAPACITY_PER_SLOT, MAX_SLOT_COUNT } from '../../shared/indiv';

export const selectIndivSchema = Type.Object({
  selection: Type.Array(
    Type.Object({
      requestId: Type.Integer({ minimum: 1 }),
      slot: Type.Integer({ minimum: 1, maximum: MAX_SLOT_COUNT })
    }),
    // Au plus une soirée pleine : au-delà, ce n'est plus une sélection.
    { maxItems: MAX_SLOT_COUNT * MAX_CAPACITY_PER_SLOT }
  )
});
