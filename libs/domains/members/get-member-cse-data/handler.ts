import { MemberCseDataRepository } from './repository';
import { Member } from '../shared/member';
import { MemberNotFoundError, MemberNotFullyPaidError } from '../shared/errors';
import { GetMemberCseDataInput, GetMemberCseDataOutput } from "./dto";

export async function getMemberCseData(db: any, id: GetMemberCseDataInput): Promise<GetMemberCseDataOutput> {
  const repo = new MemberCseDataRepository();
  const memberData = await repo.getById(db, id);
  if (!memberData) {
    throw new MemberNotFoundError();
  }

  const member = new Member(memberData);
  if (!member.canReceiveAttestation()) {
    throw new MemberNotFullyPaidError();
  }

  const tx = await repo.getLastPaymentTransaction(db, id);

  return {
    lastName: member.lastName,
    firstName: member.firstName,
    birthDate: member.birthDate,
    amount: member.amountDue,
    paymentMethod: tx ? tx.paymentMethod : 'virement',
    paymentDate: tx ? tx.date : 'date de validation',
    season: member.season
  };
}
