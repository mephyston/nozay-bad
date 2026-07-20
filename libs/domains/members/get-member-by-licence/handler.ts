import { GetMemberRepository } from './repository';
import { MemberNotFoundError } from '../shared/errors';

export async function getMemberByLicence(db: any, licence: string, season?: string) {
  const repo = new GetMemberRepository();
  const member = await repo.getByLicence(db, licence, season);
  if (!member) {
    throw new MemberNotFoundError();
  }
  return member;
}
