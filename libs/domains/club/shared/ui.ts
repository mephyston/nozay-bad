/**
 * Point d'entrée des composants et des types côté navigateur (`@nba/club-ui`).
 *
 * Ni drizzle ni Hono ici : ce fichier est importé par des composants Svelte et
 * par les pages des trois applications.
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
  NEUTRAL_CLUB_SETTINGS,
  isSettingsSection,
  isClubAsset,
  type ClubSettings,
  type ClubAsset,
  type SettingsSection,
  type SectionValues
} from './settings';
export { clubAssetPath } from './assets';
export { SECTION_SPECS, sectionSpec, type SectionSpec, type FieldSpec } from './ui-sections';
export { default as ClubSectionForm } from './ui/ClubSectionForm.svelte';
export { default as ClubFeaturesForm } from './ui/ClubFeaturesForm.svelte';
export { default as ClubAssetsForm } from './ui/ClubAssetsForm.svelte';
