import { Hono } from 'hono';
import { importMembersRoute } from './import-members-csv/route';
import { listMembersRoute } from './list-members/route';
import { exportMembersRoute } from './export-members/route';
import { lookupHouseholdRoute } from './lookup-household/route';
import { setExpenseAuthorizationRoute } from './set-expense-authorization/route';
import { listClubFunctionsRoute } from './list-club-functions/route';
import { saveClubFunctionsRoute } from './save-club-functions/route';
import { listBirthdaysRoute } from './list-birthdays/route';
import { getMemberByLicenceRoute } from './get-member-by-licence/route';
import { uploadMemberPhotoRoute } from './upload-member-photo/route';
import { getMemberPhotoRoute } from './get-member-photo/route';
import { deleteMemberPhotoRoute } from './delete-member-photo/route';
import { getMemberCseDataRoute } from './get-member-cse-data/route';
import { getAttestationConfigRoute } from './get-attestation-config/route';
import { updateAttestationConfigRoute } from './update-attestation-config/route';
import { uploadAttestationSignatureRoute } from './upload-attestation-signature/route';
import { generateCseAttestationRoute } from './generate-cse-attestation/route';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
  /** Portraits des adhérents, sous le préfixe `member-photos/` (voir `shared/photo.ts`). */
  MEDIA: R2Bucket;
  IMAGES?: ImagesBinding;
};

export const membersRouter = new Hono<{ Bindings: Bindings }>();

membersRouter.route('/', importMembersRoute);
membersRouter.route('/', listMembersRoute);
// `/export` est littérale : avant `/:licence`, qui la prendrait pour un numéro.
membersRouter.route('/', exportMembersRoute);
// Route littérale avant `/:licence` pour ne pas être capturée par le paramètre.
membersRouter.route('/', lookupHouseholdRoute);
// Littérale elle aussi : `/birthdays` serait sinon lu comme un numéro de licence.
membersRouter.route('/', listBirthdaysRoute);
membersRouter.route('/', setExpenseAuthorizationRoute);
// `/club-functions` est littérale : avant `/:licence` pour ne pas être lue comme une licence.
membersRouter.route('/', listClubFunctionsRoute);
membersRouter.route('/', saveClubFunctionsRoute);
// `/:licence/photo` avant `/:licence` : deux segments, donc aucune capture possible,
// mais l'ordre reste celui du domaine — les routes les plus spécifiques d'abord.
membersRouter.route('/', uploadMemberPhotoRoute);
membersRouter.route('/', getMemberPhotoRoute);
membersRouter.route('/', deleteMemberPhotoRoute);
membersRouter.route('/', getMemberByLicenceRoute);
membersRouter.route('/', getMemberCseDataRoute);
// Attestation CSE : configuration du modèle (routes littérales) puis génération PDF (:id).
membersRouter.route('/', getAttestationConfigRoute);
membersRouter.route('/', updateAttestationConfigRoute);
membersRouter.route('/', uploadAttestationSignatureRoute);
membersRouter.route('/', generateCseAttestationRoute);

export {
  getMemberById,
  getMembersByIds,
  getMembersBySeason,
  getMembershipForPersonInSeason,
  getAllMembers,
  getHouseholdEmailsForActiveSeason,
  getContactEmailsForMember,
  getContactEmailsForMembers,
  getContactEmailsForClubFunctions,
  getContactEmailsForLicences,
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
export * from './shared/age-categories';
export { listMembers } from './list-members/handler';
export { exportMembersEmails } from './export-members/handler';
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

/**
 * Plafond de la signature d'attestation, exporté pour que l'écran d'administration
 * n'en tienne pas une copie : deux chiffres à maintenir en accord divergent toujours,
 * et celui de l'écran ne se serait vu qu'au refus du serveur.
 */
export { MAX_SIGNATURE_BYTES } from './shared/attestation/config';
