import { type Db } from '@nba/db';
import { GetMemberRepository } from './repository';
import { MemberNotFoundError } from '../shared/errors';
import { GetMemberByLicenceLicence, GetMemberByLicenceSeason, GetMemberByLicenceOutput } from "./dto";

export async function getMemberByLicence(db: Db, licence: GetMemberByLicenceLicence, season?: GetMemberByLicenceSeason): Promise<GetMemberByLicenceOutput> {
  const repo = new GetMemberRepository();
  const member = await repo.getByLicence(db, licence, season);
  if (!member) {
    throw new MemberNotFoundError();
  }
  return member;
}
