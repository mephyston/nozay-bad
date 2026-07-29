import { membersTable } from '@nba/members/schema';


export type GetMemberByLicenceLicence = string;
export type GetMemberByLicenceSeason = string;

export type GetMemberByLicenceOutput = typeof membersTable.$inferSelect;
