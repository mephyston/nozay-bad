import { ApplyPaymentRepository } from './repository';
import { Member } from '../shared/member';

export async function applyPaymentToMember(
  db: any,
  memberId: number,
  amountCents: number
): Promise<void> {
  const repo = new ApplyPaymentRepository();
  const memberData = await repo.getById(db, memberId);
  if (!memberData) return;

  const member = new Member(memberData);
  const updatedValues = member.calculatePayment(amountCents);

  await repo.updatePayment(db, memberId, updatedValues);
}
