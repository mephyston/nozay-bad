import { Hono } from 'hono';
import { getMeRoute } from './get-me/route';
import { listUsersRoute } from './list-users/route';
import { createUserRoute } from './create-user/route';
import { updateUserRolesRoute } from './update-user-roles/route';
import { deleteUserRoute } from './delete-user/route';
import { listRolePermissionsRoute } from './list-role-permissions/route';
import { updateRolePermissionsRoute } from './update-role-permissions/route';

export type Bindings = {
  DB: D1Database;
};

export const iamRouter = new Hono<{ Bindings: Bindings }>();

// `/me` avant `/users` : sans conséquence ici (les chemins ne se recouvrent pas),
// mais l'ordre reflète la lecture — l'identité d'abord, l'administration ensuite.
iamRouter.route('/', getMeRoute);
iamRouter.route('/', listUsersRoute);
iamRouter.route('/', createUserRoute);
iamRouter.route('/', updateUserRolesRoute);
iamRouter.route('/', deleteUserRoute);
iamRouter.route('/', listRolePermissionsRoute);
iamRouter.route('/', updateRolePermissionsRoute);
