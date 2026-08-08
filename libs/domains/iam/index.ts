export * from './shared/schema';
export * from './shared/permissions';
export * from './shared/roles';
export * from './shared/catalog';
export * from './shared/role-permissions';
export * from './shared/errors';
export * from './router';

// Résolution d'identité : utilisée par le middleware d'autorisation de l'API et par
// l'application admin, qui passent ainsi par exactement le même code.
export { getActor } from './get-actor/handler';
export { toActorDto, normalizeEmail, type Actor, type ActorDto } from './get-actor/dto';
export { getMe } from './get-me/handler';
export { listRolePermissions } from './list-role-permissions/handler';
export type { RoleSummary } from './list-role-permissions/dto';
