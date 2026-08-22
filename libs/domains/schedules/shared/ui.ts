/**
 * Écrans du domaine des créneaux (`@nba/schedules-ui`).
 *
 * L'administration y tient la grille hebdomadaire ; l'espace adhérent y prend ses
 * inscriptions au jeu libre. Deux publics, un seul barrel — c'est le domaine qui décide
 * de ce qu'il expose, pas l'application qui l'affiche.
 */
export { default as SchedulesManager } from '../list-schedule-slots/ui/SchedulesManager.svelte';

/** Îlot d'inscription à une séance de jeu libre, posé par l'espace adhérent. */
export { default as OpenPlaySignup } from '../open-play/register-to-open-play/ui/OpenPlaySignup.svelte';

/** Écran du bureau : les séances de jeu libre, leurs inscrits, leur ouvreur. */
export { default as OpenPlayManager } from '../open-play/list-open-play-sessions/ui/OpenPlayManager.svelte';
