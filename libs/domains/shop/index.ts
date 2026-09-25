import { Hono } from 'hono';
import { listProductsRoute } from './list-products/route';
import { createProductRoute } from './create-product/route';
import { updateProductRoute } from './update-product/route';
import { deleteProductRoute } from './delete-product/route';
import { productImageRoute } from './upload-product-image/route';
import { listOrdersRoute } from './list-orders/route';
import { createOrderRoute } from './create-order/route';
import { validateOrderRoute } from './validate-order/route';
import { payOrderRoute } from './pay-order/route';
import { rejectOrderRoute } from './reject-order/route';
import { cancelOrderRoute } from './cancel-order/route';
import { unpayOrderRoute } from './unpay-order/route';
import { updateOrderRoute } from './update-order/route';
import { manageProductCategoriesRoute } from './manage-product-categories/route';

export { getUnvalidatedPaidOrders, getOrdersAwaitingPaymentSince, type OrderAwaitingPayment } from './queries';
export { ORDER_STATUSES, OPEN_ORDER_STATUSES, type OrderStatus } from './shared/order';
export { productDisplayName, compareVariantLabels } from './shared/product';
export { listProducts } from './list-products/handler';
export type { ListedProduct } from './list-products/dto';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
  MEDIA: R2Bucket;
  IMAGES?: ImagesBinding;
};

export const shopRouter = new Hono<{ Bindings: Bindings }>();

shopRouter.route('/', listProductsRoute);
shopRouter.route('/', createProductRoute);
shopRouter.route('/', updateProductRoute);
shopRouter.route('/', deleteProductRoute);
shopRouter.route('/', productImageRoute);
shopRouter.route('/', listOrdersRoute);
shopRouter.route('/', createOrderRoute);
shopRouter.route('/', validateOrderRoute);
shopRouter.route('/', payOrderRoute);
shopRouter.route('/', rejectOrderRoute);
shopRouter.route('/', cancelOrderRoute);
shopRouter.route('/', unpayOrderRoute);
shopRouter.route('/', updateOrderRoute);
shopRouter.route('/', manageProductCategoriesRoute);

export * from './shared/dashboard';
