import { Hono } from 'hono';
import { importMembersRoute } from './import-members-csv/route';
import { listMembersRoute } from './list-members/route';
import { lookupHouseholdRoute } from './lookup-household/route';
import { setExpenseAuthorizationRoute } from './set-expense-authorization/route';
import { listClubFunctionsRoute } from './list-club-functions/route';
import { saveClubFunctionsRoute } from './save-club-functions/route';
import { listBirthdaysRoute } from './list-birthdays/route';
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
// Littérale elle aussi : `/birthdays` serait sinon lu comme un numéro de licence.
membersRouter.route('/', listBirthdaysRoute);
membersRouter.route('/', setExpenseAuthorizationRoute);
// `/club-functions` est littérale : avant `/:licence` pour ne pas être lue comme une licence.
membersRouter.route('/', listClubFunctionsRoute);
membersRouter.route('/', saveClubFunctionsRoute);
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
  getContactEmailsForMembers,
  getContactEmailsForClubFunctions,
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
export { listClubFunctions } from './list-club-functions/handler';
export { saveClubFunctions } from './save-club-functions/handler';
export type { ClubFunctionAssignment } from './list-club-functions/dto';
export {
  CLUB_FUNCTIONS,
  CLUB_FUNCTION_LABELS,
  SINGLE_HOLDER_FUNCTIONS,
  isClubFunction,
  type ClubFunction
} from './shared/club-functions';
