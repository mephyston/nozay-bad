import { Hono } from 'hono';
import { subscribeRoute } from './subscribe/route';
import { unsubscribeRoute } from './unsubscribe/route';
import { dispatchRoute } from './dispatch/route';
import { preferencesRoute } from './preferences/route';
import { statsRoute } from './stats/route';
import type { VapidEnv } from './shared/vapid';

export type Bindings = {
  DB: D1Database;
} & VapidEnv;

export const notificationsRouter = new Hono<{ Bindings: Bindings }>();

notificationsRouter.route('/', subscribeRoute);
notificationsRouter.route('/', unsubscribeRoute);
notificationsRouter.route('/', dispatchRoute);
notificationsRouter.route('/', preferencesRoute);
notificationsRouter.route('/', statsRoute);

// API publique du contexte : consommée par le cron de `nba-api` et par les autres
// domaines qui déclenchent une notification sur un événement métier.
export { enqueueNotification, notifyContacts } from './enqueue/handler';
export type {
  EnqueueNotificationInput,
  EnqueueNotificationOutput,
  NotificationTarget,
  NotificationTargetLabel
} from './enqueue/dto';
export { dispatchPendingNotifications, purgeNotificationHistory } from './dispatch/handler';
export { getNotificationOverview, getNotificationSubscribers } from './stats/handler';
export { getPreferences, updatePreferences } from './preferences/handler';
export type { CategoryPreference } from './preferences/dto';
export { resolveVapid, type VapidEnv } from './shared/vapid';
export { sendNotificationSchema } from './shared/validators';
export { STOREFRONT_PAGES, isStorefrontPage, type StorefrontPagePath } from './shared/storefront-pages';
export {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_IDS,
  categoryLabel,
  isNotificationCategory,
  type NotificationCategory
} from './shared/categories';
