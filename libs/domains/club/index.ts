import { Hono } from 'hono';
import { getClubSettingsRoute } from './get-club-settings/route';
import { updateClubSettingsRoute } from './update-club-settings/route';
import { updateClubFeaturesRoute } from './update-club-features/route';
import { uploadClubAssetRoute } from './upload-club-asset/route';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

/**
 * Le domaine « club » : l'identité du club et ce qu'il a choisi d'utiliser.
 *
 * Feuille : il ne dépend d'aucun autre domaine, et tous peuvent le lire — c'est
 * lui qui remplace les constantes que chacun portait en dur.
 */
export const clubRouter = new Hono<{ Bindings: Bindings }>();

clubRouter.route('/', getClubSettingsRoute);
clubRouter.route('/', updateClubSettingsRoute);
clubRouter.route('/', updateClubFeaturesRoute);
clubRouter.route('/', uploadClubAssetRoute);

export * from './shared/settings-api';
export { getClubSettingsView, type GetClubSettingsOutput } from './get-club-settings/handler';
export { updateClubSettings, isValidIban, isValidTimezone } from './update-club-settings/handler';
export { updateClubFeatures } from './update-club-features/handler';
export { uploadClubAsset, removeClubAsset, addPartnerLogo, setPartnerLogos, MAX_PARTNER_LOGOS } from './upload-club-asset/handler';
export { MAX_CLUB_ASSET_BYTES, clubAssetPath, r2ClubAssetStore, type ClubAssetStore } from './shared/assets';
