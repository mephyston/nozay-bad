import { Type } from '@sinclair/typebox';

export const walletDeviceSchema = Type.Object({ deviceId: Type.String({ minLength: 8, maxLength: 64 }) });
export const movementParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }), movementId: Type.String({ pattern: '^[0-9]+$' }) });
export const walletParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
