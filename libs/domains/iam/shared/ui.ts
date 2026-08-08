export { default as UsersManager } from '../components/UsersManager.svelte';
export * from './permissions';
export * from './roles';
// `get-actor/dto` ne dépend que de types : ce barrel reste utilisable côté navigateur
// et par le middleware admin, sans jamais tirer le code d'accès à la base.
export { toActorDto, normalizeEmail, type Actor, type ActorDto } from '../get-actor/dto';
