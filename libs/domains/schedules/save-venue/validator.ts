import { Type } from '@sinclair/typebox';

export const saveVenueSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 60, pattern: '^[a-z0-9-]+$' }),
  name: Type.String({ minLength: 1, maxLength: 120 }),
  streetAddress: Type.Optional(Type.String({ maxLength: 200 })),
  postalCode: Type.Optional(Type.String({ maxLength: 10 })),
  city: Type.Optional(Type.String({ maxLength: 100 })),
  latitude: Type.Optional(Type.String({ maxLength: 24 })),
  longitude: Type.Optional(Type.String({ maxLength: 24 }))
});
