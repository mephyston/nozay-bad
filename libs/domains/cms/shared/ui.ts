/**
 * Composants d'administration du site public (`@nba/cms-ui`).
 *
 * Barrel volontairement mince : seuls les écrans complets sortent d'ici, pas les
 * sous-composants ni les modules d'actions, qui restent internes à leur tranche.
 */
export { default as MediaLibrary } from '../media/list-media/ui/MediaLibrary.svelte';
export { default as PagesManager } from '../pages/list-pages/ui/PagesManager.svelte';
export { default as PageEditor } from '../pages/save-page-blocks/ui/PageEditor.svelte';
