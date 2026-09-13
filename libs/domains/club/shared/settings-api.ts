/**
 * Ce que les autres domaines et les applications lisent du club, sans les routes.
 *
 * Exposé sous l'alias `@nba/club/settings` : importer le barrel `@nba/club` tirerait
 * Hono et les slices dans un composant Svelte ou un middleware Astro qui n'ont
 * besoin que des types, du catalogue et des lecteurs.
 */
export {
  FEATURES,
  FEATURE_CATALOG,
  FEATURE_GROUPS,
  FEATURE_PREREQUISITES,
  ALL_FEATURES_ON,
  effectiveFeatures,
  isFeature,
  type Feature,
  type FeatureGroup,
  type FeatureInfo,
  type FeatureState
} from './features';
export {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_NAMES,
  CLUB_ASSETS,
  CLUB_ASSET_COLUMNS,
  NEUTRAL_CLUB_SETTINGS,
  isSettingsSection,
  isClubAsset,
  settingsFromRow,
  parsePartnerLogoKeys,
  type ClubSettings,
  type ClubAsset,
  type SettingsSection,
  type SectionValues
} from './settings';
export {
  getClubSettings,
  getClubFeatures,
  forgetClubSettings,
  forgetClubFeatures,
  CLUB_SETTINGS_ID
} from './repository';
export { clubAssetPath } from './assets';
