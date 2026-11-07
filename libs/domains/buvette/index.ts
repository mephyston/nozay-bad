import { Hono } from 'hono';
import { manageItemsRoute } from './manage-items/route';
import { manageSettingsRoute } from './manage-settings/route';
import { getCurrentSessionRoute } from './get-current-session/route';
import { openSessionRoute } from './open-session/route';
import { closeSessionRoute } from './close-session/route';
import { createSaleRoute } from './create-sale/route';
import { cancelSaleRoute } from './cancel-sale/route';
import { scanCardRoute } from './scan-card/route';
import { refundCardRoute } from './refund-card/route';
import { openCardRoute } from './open-card/route';
import { cardWalletRoute } from './card-wallet/route';

export type Bindings = {
  DB: D1Database;
  BUVETTE_TOKEN_SECRET?: string;
};

export const buvetteRouter = new Hono<{ Bindings: Bindings }>();

buvetteRouter.route('/', manageItemsRoute);
buvetteRouter.route('/', manageSettingsRoute);
buvetteRouter.route('/', getCurrentSessionRoute);
buvetteRouter.route('/', openSessionRoute);
buvetteRouter.route('/', closeSessionRoute);
buvetteRouter.route('/', createSaleRoute);
buvetteRouter.route('/', cancelSaleRoute);
// Avant `/cards/:id/…` : les routes fixes ne doivent pas tomber sur le paramètre.
buvetteRouter.route('/', scanCardRoute);
buvetteRouter.route('/', refundCardRoute);
buvetteRouter.route('/', openCardRoute);
buvetteRouter.route('/', cardWalletRoute);
