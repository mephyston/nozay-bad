import { ApplyPaymentRepository } from './repository';
import { Member } from '../shared/member';
import { ApplyPaymentToMemberMemberId, ApplyPaymentToMemberAmountCents, ApplyPaymentToMemberOutput } from "./dto";

export async function applyPaymentToMember(
  db: any,
  memberId: ApplyPaymentToMemberMemberId,
  amountCents: ApplyPaymentToMemberAmountCents
): Promise<ApplyPaymentToMemberOutput> {
  const repo = new ApplyPaymentRepository();
  const memberData = await repo.getById(db, memberId);
  if (!memberData) return;

  const member = new Member(memberData);
  const updatedValues = member.calculatePayment(amountCents);

  await repo.updatePayment(db, memberId, updatedValues);
}
