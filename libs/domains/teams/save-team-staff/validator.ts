import { Type } from '@sinclair/typebox';

const licence = Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()]);

export const saveTeamStaffSchema = Type.Object({
  captainLicence: licence,
  viceCaptainLicence: licence
});
