import { Hono } from 'hono';
import { manageItemsRoute } from './manage-items/route';
import { manageSettingsRoute } from './manage-settings/route';
import { getCurrentSessionRoute } from './get-current-session/route';
import { listSessionSalesRoute } from './list-session-sales/route';
import { openSessionRoute } from './open-session/route';
import { closeSessionRoute } from './close-session/route';
import { createSaleRoute } from './create-sale/route';
import { cancelSaleRoute } from './cancel-sale/route';
import { scanCardRoute } from './scan-card/route';
import { refundCardRoute } from './refund-card/route';
import { openCardRoute } from './open-card/route';
import { cardWalletRoute } from './card-wallet/route';
import { cardAttemptsRoute } from './verify-card-attempt/route';
import { clientOrderRoute } from './client-order/route';
import { listOrdersRoute } from './list-orders/route';
import { paperCardsRoute } from './paper-cards/route';
import { refundCardPaymentRoute } from './refund-card-payment/route';

export { verifyPendingAttempts } from './verify-card-attempt/handler';
export { createSumUpClient, type SumUpBindings } from './shared/sumup';
export { settlePendingRefunds } from './refund-card-payment/handler';
export { createSumUpRefunds } from './shared/sumup-refunds';

export type Bindings = {
  DB: D1Database;
  BUVETTE_TOKEN_SECRET?: string;
  SUMUP_API_KEY?: string;
  SUMUP_MERCHANT_CODE?: string;
};

export const buvetteRouter = new Hono<{ Bindings: Bindings }>();

buvetteRouter.route('/', manageItemsRoute);
buvetteRouter.route('/', manageSettingsRoute);
buvetteRouter.route('/', listSessionSalesRoute);
buvetteRouter.route('/', getCurrentSessionRoute);
buvetteRouter.route('/', openSessionRoute);
buvetteRouter.route('/', closeSessionRoute);
buvetteRouter.route('/', createSaleRoute);
buvetteRouter.route('/', cancelSaleRoute);
buvetteRouter.route('/', cardAttemptsRoute);
buvetteRouter.route('/', refundCardPaymentRoute);
buvetteRouter.route('/', listOrdersRoute);
buvetteRouter.route('/', paperCardsRoute);
// Avant `/cards/:id/…` : les routes fixes ne doivent pas tomber sur le paramètre.
buvetteRouter.route('/', scanCardRoute);
buvetteRouter.route('/', refundCardRoute);
buvetteRouter.route('/', openCardRoute);
buvetteRouter.route('/', clientOrderRoute);
buvetteRouter.route('/', cardWalletRoute);
