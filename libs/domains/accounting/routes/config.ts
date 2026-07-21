import { Hono } from 'hono';
import { listCategoriesRoute } from '../queries/list-categories/route';
import { createCategoryRoute } from '../commands/create-category/route';
import { updateCategoryRoute } from '../commands/update-category/route';
import { deleteCategoryRoute } from '../commands/delete-category/route';
import { listAccountClassesRoute } from '../queries/list-account-classes/route';
import { createAccountClassRoute } from '../commands/create-account-class/route';
import { updateAccountClassRoute } from '../commands/update-account-class/route';
import { deleteAccountClassRoute } from '../commands/delete-account-class/route';
import type { Bindings } from '../index';

export const configRouter = new Hono<{ Bindings: Bindings }>();

configRouter.route('/', listCategoriesRoute);
configRouter.route('/', createCategoryRoute);
configRouter.route('/', updateCategoryRoute);
configRouter.route('/', deleteCategoryRoute);
configRouter.route('/', listAccountClassesRoute);
configRouter.route('/', createAccountClassRoute);
configRouter.route('/', updateAccountClassRoute);
configRouter.route('/', deleteAccountClassRoute);
