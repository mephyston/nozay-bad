import { Type } from '@sinclair/typebox';

export const orderParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
export const orderDeviceSchema = Type.Object({ deviceId: Type.String({ minLength: 8, maxLength: 64 }) });
export const createOrderSchema = Type.Object({
  deviceId: Type.String({ minLength: 8, maxLength: 64 }),
  lines: Type.Array(Type.Object({
    itemId: Type.Integer({ minimum: 1 }),
    quantity: Type.Integer({ minimum: 1, maximum: 20 })
  }), { minItems: 1, maxItems: 30 })
});
