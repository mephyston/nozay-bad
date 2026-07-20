import { Hono } from 'hono';
import { importMembersRoute } from './import-members-csv/route';
import { listMembersRoute } from './list-members/route';
import { getMemberByLicenceRoute } from './get-member-by-licence/route';
import { getMemberCseDataRoute } from './get-member-cse-data/route';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const membersRouter = new Hono<{ Bindings: Bindings }>();

membersRouter.route('/', importMembersRoute);
membersRouter.route('/', listMembersRoute);
membersRouter.route('/', getMemberByLicenceRoute);
membersRouter.route('/', getMemberCseDataRoute);

export { applyPaymentToMember } from './apply-payment/handler';
export {
  getMemberById,
  getMembersByIds,
  getMembersBySeason,
  getAllMembers,
  type MemberSummary
} from './shared/queries';
