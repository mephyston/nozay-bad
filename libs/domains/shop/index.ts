import { Hono } from 'hono';
import { listProductsRoute } from './list-products/route';
import { createProductRoute } from './create-product/route';
import { updateProductRoute } from './update-product/route';
import { listOrdersRoute } from './list-orders/route';
import { createOrderRoute } from './create-order/route';
import { validateOrderRoute } from './validate-order/route';
import { payOrderRoute } from './pay-order/route';
import { rejectOrderRoute } from './reject-order/route';
import { cancelOrderRoute } from './cancel-order/route';
import { unpayOrderRoute } from './unpay-order/route';
import { manageProductCategoriesRoute } from './manage-product-categories/route';

export { getUnvalidatedPaidOrders, getOrdersAwaitingPaymentSince, type OrderAwaitingPayment } from './queries';
export { ORDER_STATUSES, OPEN_ORDER_STATUSES, type OrderStatus } from './shared/order';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const shopRouter = new Hono<{ Bindings: Bindings }>();

shopRouter.route('/', listProductsRoute);
shopRouter.route('/', createProductRoute);
shopRouter.route('/', updateProductRoute);
shopRouter.route('/', listOrdersRoute);
shopRouter.route('/', createOrderRoute);
shopRouter.route('/', validateOrderRoute);
shopRouter.route('/', payOrderRoute);
shopRouter.route('/', rejectOrderRoute);
shopRouter.route('/', cancelOrderRoute);
shopRouter.route('/', unpayOrderRoute);
shopRouter.route('/', manageProductCategoriesRoute);

export * from './shared/dashboard';
