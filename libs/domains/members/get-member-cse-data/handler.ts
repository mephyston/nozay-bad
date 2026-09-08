import { type Db } from '@nba/db';
import { MemberCseDataRepository } from './repository';
import { Member } from '../shared/member';
import { MemberNotFoundError, MemberNothingPaidError } from '../shared/errors';
import { GetMemberCseDataInput, GetMemberCseDataOutput } from "./dto";

export async function getMemberCseData(db: Db, id: GetMemberCseDataInput): Promise<GetMemberCseDataOutput> {
  const repo = new MemberCseDataRepository();
  const memberData = await repo.getById(db, id);
  if (!memberData) {
    throw new MemberNotFoundError();
  }

  const member = new Member(memberData as any);
  if (!member.canReceiveAttestation()) {
    throw new MemberNothingPaidError();
  }

  const tx = await repo.getLastPaymentTransaction(db, id);
  // `seasonId` (FK entier) résolu en code de saison via le domaine accounting.
  const seasonCode = await repo.getSeasonCode(db, memberData.seasonId);

  return {
    lastName: member.lastName,
    firstName: member.firstName,
    birthDate: member.birthDate,
    amount: member.amountDue,
    amountReceived: member.amountReceived,
    paymentMethod: tx ? tx.paymentMethod : 'virement',
    // Date de règlement Poona uniquement : la date de l'écriture comptable (`tx.date`)
    // est celle de la saisie du trésorier, pas celle du paiement de l'adhérent.
    // Vide → l'attestation est datée du 1er septembre de la saison (cf. seasonIssueDate).
    paymentDate: memberData.paymentDate ?? '',
    season: seasonCode ?? ''
  };
}
