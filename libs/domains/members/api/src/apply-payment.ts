import { eq } from 'drizzle-orm';
import { membersTable } from '@metacult/features-members-data-access';

/**
 * Apply a membership payment to a member's account.
 * Updates amountReceived, amountRemaining, and paid status.
 *
 * @param db      - Drizzle database instance (or transaction)
 * @param memberId - The member's ID
 * @param amountCents - Amount received, in cents (positive integer)
 */
export async function applyPaymentToMember(
  db: any,
  memberId: number,
  amountCents: number
): Promise<void> {
  const member = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .get();

  if (!member) return;

  const newReceived = member.amountReceived + amountCents;
  const newRemaining = Math.max(0, member.amountDue - newReceived);
  const isPaid = newRemaining === 0;

  await db
    .update(membersTable)
    .set({
      amountReceived: newReceived,
      amountRemaining: newRemaining,
      paid: isPaid,
    })
    .where(eq(membersTable.id, memberId))
    .run();
}
