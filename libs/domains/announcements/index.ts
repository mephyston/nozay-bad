import { Hono } from 'hono';
import { listAnnouncementsRoute } from './list-announcements/route';
import { createAnnouncementRoute } from './create-announcement/route';
import { updateAnnouncementRoute } from './update-announcement/route';
import { deleteAnnouncementRoute } from './delete-announcement/route';
import { notifyAnnouncementRoute } from './notify-announcement/route';

export type Bindings = {
  DB: D1Database;
};

export const announcementsRouter = new Hono<{ Bindings: Bindings }>();

// `/:id/notify` avant `/:id` : Hono retient la première route qui correspond, et un
// motif à paramètre placé trop tôt capterait le segment suivant.
announcementsRouter.route('/', notifyAnnouncementRoute);
announcementsRouter.route('/', listAnnouncementsRoute);
announcementsRouter.route('/', createAnnouncementRoute);
announcementsRouter.route('/', updateAnnouncementRoute);
announcementsRouter.route('/', deleteAnnouncementRoute);

// API publique du contexte.
export { listAnnouncements } from './list-announcements/handler';
export type { ListAnnouncementsInput, ListAnnouncementsOutput } from './list-announcements/dto';
export { sanitizeRichText, richTextToPlain, isRichTextEmpty } from './shared/rich-text';
