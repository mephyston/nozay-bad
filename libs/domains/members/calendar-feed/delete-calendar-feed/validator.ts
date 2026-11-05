import { Type } from '@sinclair/typebox';

export const calendarFeedLicenceQuerySchema = Type.Object({
  licence: Type.String({ minLength: 1, maxLength: 20 })
});
