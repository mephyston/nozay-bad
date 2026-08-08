import { Hono } from 'hono';
import { importMembersRoute } from './import-members-csv/route';
import { listMembersRoute } from './list-members/route';
import { lookupHouseholdRoute } from './lookup-household/route';
import { setExpenseAuthorizationRoute } from './set-expense-authorization/route';
import { getMemberByLicenceRoute } from './get-member-by-licence/route';
import { getMemberCseDataRoute } from './get-member-cse-data/route';
import { getAttestationConfigRoute } from './get-attestation-config/route';
import { updateAttestationConfigRoute } from './update-attestation-config/route';
import { uploadAttestationSignatureRoute } from './upload-attestation-signature/route';
import { generateCseAttestationRoute } from './generate-cse-attestation/route';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const membersRouter = new Hono<{ Bindings: Bindings }>();

membersRouter.route('/', importMembersRoute);
membersRouter.route('/', listMembersRoute);
// Route littérale avant `/:licence` pour ne pas être capturée par le paramètre.
membersRouter.route('/', lookupHouseholdRoute);
membersRouter.route('/', setExpenseAuthorizationRoute);
membersRouter.route('/', getMemberByLicenceRoute);
membersRouter.route('/', getMemberCseDataRoute);
// Attestation CSE : configuration du modèle (routes littérales) puis génération PDF (:id).
membersRouter.route('/', getAttestationConfigRoute);
membersRouter.route('/', updateAttestationConfigRoute);
membersRouter.route('/', uploadAttestationSignatureRoute);
membersRouter.route('/', generateCseAttestationRoute);

export { applyPaymentToMember, buildApplyPaymentStatement } from './apply-payment/handler';
export {
  getMemberById,
  getMembersByIds,
  getMembersBySeason,
  getAllMembers,
  getHouseholdEmailsForActiveSeason,
  getContactEmailsForMember,
  getMemberGroupsForActiveSeason,
  getMemberContactsByEmails,
  getBirthdaysForActiveSeason,
  type MemberBirthday,
  type MemberGroup,
  type MemberContact,
  isSeasonClosed,
  type MemberSummary
} from './shared/queries';
export * from './shared/dashboard';
export { listMembers } from './list-members/handler';
export { getMemberStats } from './get-member-stats/handler';
