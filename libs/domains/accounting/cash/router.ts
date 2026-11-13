import { Hono } from 'hono';
import type { CashMailDeps } from '../shared/cash';
import { openCashReceiptRoute } from './open-cash-receipt/route';
import { getCashReceiptRoute } from './get-cash-receipt/route';
import { renewCashTokenRoute } from './renew-cash-token/route';
import { createSendCashReceiptCodeRoute } from './send-cash-receipt-code/route';
import { createSignCashReceiptRoute } from './sign-cash-receipt/route';
import { createConfirmCashReceiptRoute } from './confirm-cash-receipt/route';
import { cancelCashReceiptRoute } from './cancel-cash-receipt/route';
import { listCashReceiptsRoute } from './list-cash-receipts/route';
import { listCashInHandRoute } from './list-cash-in-hand/route';
import { openCashHandoverRoute } from './open-cash-handover/route';
import { getCashHandoverRoute } from './get-cash-handover/route';
import { signCashHandoverRoute } from './sign-cash-handover/route';
import { cancelCashHandoverRoute } from './cancel-cash-handover/route';

/**
 * L'encaissement d'espèces (RF-ACC-003), monté par l'API sous `/accounting`.
 *
 * À part du routeur de la comptabilité : trois tranches écrivent au payeur, et seule
 * l'API sait composer une messagerie — elle la fournit ici.
 *
 * L'ordre compte : les chemins fixes (`/cash-receipts/preview`, `/confirm`) avant ceux
 * qui prennent un identifiant.
 */
export function createCashRouter(deps: CashMailDeps) {
  const router = new Hono<{ Bindings: { DB: D1Database } }>();
  router.route('/', createConfirmCashReceiptRoute(deps));
  router.route('/', signCashHandoverRoute);
  router.route('/', listCashReceiptsRoute);
  router.route('/', openCashReceiptRoute);
  router.route('/', getCashReceiptRoute);
  router.route('/', renewCashTokenRoute);
  router.route('/', createSendCashReceiptCodeRoute(deps));
  router.route('/', createSignCashReceiptRoute(deps));
  router.route('/', cancelCashReceiptRoute);
  router.route('/', listCashInHandRoute);
  router.route('/', openCashHandoverRoute);
  router.route('/', getCashHandoverRoute);
  router.route('/', cancelCashHandoverRoute);
  return router;
}
