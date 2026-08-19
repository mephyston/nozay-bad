/**
 * Écrans de l'agenda (`@nba/events-ui`).
 *
 * Deux publics distincts : `EventsManager` tient l'agenda côté administration,
 * `EventSignup` inscrit un adhérent depuis l'espace adhérent.
 */
export { default as EventsManager } from '../list-events/ui/EventsManager.svelte';
export { default as EventSignup } from '../register-to-event/ui/EventSignup.svelte';
