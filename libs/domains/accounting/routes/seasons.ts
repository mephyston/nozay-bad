import { Hono } from 'hono';
import { listSeasonsRoute } from '../queries/list-seasons/route';
import { createSeasonRoute } from '../commands/create-season/route';
import { updateSeasonRoute } from '../commands/update-season/route';
import { closeSeasonRoute } from '../commands/close-season/route';
import { getSeasonBudgetRoute } from '../queries/get-season-budget/route';
import { updateSeasonBudgetRoute } from '../commands/update-season-budget/route';
import { getSeasonBalanceRoute } from '../queries/get-season-balance/route';
import { getSeasonBalancesRoute } from '../queries/get-season-balances/route';
import { updateSeasonBalancesRoute } from '../commands/update-season-balances/route';
import { getSeasonReportsRoute } from '../queries/get-season-reports/route';
import type { Bindings } from '../index';

export const seasonsRouter = new Hono<{ Bindings: Bindings }>();

seasonsRouter.route('/', listSeasonsRoute);
seasonsRouter.route('/', createSeasonRoute);
seasonsRouter.route('/', updateSeasonRoute);
seasonsRouter.route('/', closeSeasonRoute);
seasonsRouter.route('/', getSeasonBudgetRoute);
seasonsRouter.route('/', updateSeasonBudgetRoute);
seasonsRouter.route('/', getSeasonBalanceRoute);
seasonsRouter.route('/', getSeasonBalancesRoute);
seasonsRouter.route('/', updateSeasonBalancesRoute);
seasonsRouter.route('/', getSeasonReportsRoute);
