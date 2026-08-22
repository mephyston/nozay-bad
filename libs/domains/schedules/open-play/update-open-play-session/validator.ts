import { Type } from '@sinclair/typebox';
import { OPEN_PLAY_STATUSES } from '../../shared/open-play-schema';

export const updateOpenPlaySessionSchema = Type.Object({
  date: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  venueId: Type.Optional(Type.Integer({ minimum: 1 })),
  startTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  endTime: Type.Optional(Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' })),
  minPlayers: Type.Optional(Type.Integer({ minimum: 1, maximum: 40 })),
  label: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  notes: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  status: Type.Optional(Type.Union(OPEN_PLAY_STATUSES.map((s) => Type.Literal(s)))),
  cancelledReason: Type.Optional(Type.Union([Type.String({ maxLength: 300 }), Type.Null()])),
  openerLicence: Type.Optional(Type.Union([Type.String({ maxLength: 20 }), Type.Null()])),
  openerFirstName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  openerLastName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()]))
});
