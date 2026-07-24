import { type Db } from '@nba/db';
import { ApplyPaymentRepository } from './repository';
import { Member } from '../shared/member';
import { ApplyPaymentToMemberMemberId, ApplyPaymentToMemberAmountCents, ApplyPaymentToMemberOutput } from "./dto";

export function buildApplyPaymentStatement(
  db: Db,
  memberData: any,
  amountCents: number
): any {
  const member = new Member(memberData as any);
  const updatedValues = member.calculatePayment(amountCents);
  const repo = new ApplyPaymentRepository();
  return repo.buildUpdatePaymentStatement(db, memberData.id, updatedValues);
}

export async function applyPaymentToMember(
  db: Db,
  memberId: ApplyPaymentToMemberMemberId,
  amountCents: ApplyPaymentToMemberAmountCents
): Promise<ApplyPaymentToMemberOutput> {
  const repo = new ApplyPaymentRepository();
  const memberData = await repo.getById(db, memberId);
  if (!memberData) return;

  const member = new Member(memberData as any);
  const updatedValues = member.calculatePayment(amountCents);

  await repo.updatePayment(db, memberId, updatedValues);
}
