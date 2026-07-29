import { Hono } from 'hono';
import { listProductsRoute } from './list-products/route';
import { createProductRoute } from './create-product/route';
import { updateProductRoute } from './update-product/route';
import { listOrdersRoute } from './list-orders/route';
import { createOrderRoute } from './create-order/route';
import { approveOrderRoute } from './approve-order/route';
import { rejectOrderRoute } from './reject-order/route';
import { manageProductCategoriesRoute } from './manage-product-categories/route';

export { getUnvalidatedPaidOrders } from './queries';

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
shopRouter.route('/', approveOrderRoute);
shopRouter.route('/', rejectOrderRoute);
shopRouter.route('/', manageProductCategoriesRoute);
