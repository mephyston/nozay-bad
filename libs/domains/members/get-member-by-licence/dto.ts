import { membersTable } from '../shared/schema';

export type GetMemberByLicenceLicence = string;
export type GetMemberByLicenceSeason = string;

export type GetMemberByLicenceOutput = typeof membersTable.$inferSelect;
