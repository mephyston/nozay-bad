import { Hono } from 'hono';
import { buildMembersDashboardStatsStmt, buildMembersAgePyramidStmt, buildMembersLapsedByGroupStmt, buildMembersRenewalByGroupStmt, agePyramid, seasonReferenceYear } from '@nba/members-api';
import { buildExpensesDashboardStatsStmt } from '@nba/expenses-api';
import { buildShopDashboardStatsStmt } from '@nba/shop-api';
import { buildAccountingDashboardStatsStmts, createGetFeeBreakdownRoute } from '@nba/accounting-api';
import { assemblePoles } from './dashboard-poles';

export const dashboardRouter = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * L'effectif d'une saison, pour « Où va votre cotisation » : la même règle que le compteur
 * du tableau de bord (dossiers suspendus exclus), lue chez les adhérents.
 */
const countMembers = (d1: D1Database) => async (seasonId: number) => {
  const row = await buildMembersDashboardStatsStmt(d1, seasonId, null).first<{ currentTotal: number | null }>();
  return row?.currentTotal ?? 0;
};

// Le bureau voit le détail par catégorie ; l'espace adhérent, les seules rubriques.
dashboardRouter.route('/', createGetFeeBreakdownRoute({ countMembers, withDetails: true }));
dashboardRouter.route('/members', createGetFeeBreakdownRoute({ countMembers, withDetails: false }));

dashboardRouter.get('/overview', async (c) => {
  const db = c.env.DB;
  const seasonQuery = c.req.query('seasonId');

  try {
    let seasonId: number;
    let seasonCode: string;
    let seasonStartDate: string | null;

    if (seasonQuery) {
      const s = await db.prepare('SELECT id, code, start_date FROM seasons WHERE code = ? OR id = ?').bind(seasonQuery, seasonQuery).first();
      if (!s) return c.json({ success: false, error: 'Season not found' }, 404);
      seasonId = s.id as number;
      seasonCode = s.code as string;
      seasonStartDate = (s.start_date as string | null) ?? null;
    } else {
      const s = await db.prepare('SELECT id, code, start_date FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1').first();
      if (!s) return c.json({ success: false, error: 'No active season' }, 404);
      seasonId = s.id as number;
      seasonCode = s.code as string;
      seasonStartDate = (s.start_date as string | null) ?? null;
    }

    // derive previous season code
    let prevSeasonId: number | null = null;
    const parts = seasonCode.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      const prevCode = `${(start - 1).toString().padStart(2, '0')}-${(end - 1).toString().padStart(2, '0')}`;
      const ps = await db.prepare('SELECT id FROM seasons WHERE code = ?').bind(prevCode).first();
      if (ps) prevSeasonId = ps.id as number;
    }

    const batch = await db.batch([
      buildMembersDashboardStatsStmt(db, seasonId, prevSeasonId),
      buildExpensesDashboardStatsStmt(db, seasonId),
      buildShopDashboardStatsStmt(db, seasonId),
      ...buildAccountingDashboardStatsStmts(db, seasonId),
      buildMembersAgePyramidStmt(db, seasonId),
      // Sans saison précédente, rien à comparer : la lecture est sautée, pas vidée.
      ...(prevSeasonId === null ? [] : [buildMembersLapsedByGroupStmt(db, seasonId, prevSeasonId), buildMembersRenewalByGroupStmt(db, seasonId, prevSeasonId)])
    ]);

    const membersRes = batch[0].results[0] as any;
    const expensesRes = batch[1].results[0] as any;
    const ordersRes = batch[2].results[0] as any;
    const checksRes = batch[3].results[0] as any;
    const depositsRes = batch[4].results[0] as any;
    const invoicesRes = batch[5].results[0] as any;
    const polesRes = batch[6].results as any[];
    const agesRes = batch[7].results as { birthYear: number; gender: string; n: number }[];
    const lapsedByGroup = prevSeasonId === null
      ? []
      : (batch[8].results as { groupe: string; previousTotal: number; lapsed: number }[]).map((r) => ({
          group: r.groupe,
          previousTotal: r.previousTotal,
          lapsed: r.lapsed
        }));
    const renewalByGroup = prevSeasonId === null
      ? []
      : (batch[9].results as { groupe: string; total: number; renewed: number }[]).map((r) => ({
          group: r.groupe,
          total: r.total,
          renewed: r.renewed,
          newcomers: r.total - r.renewed
        }));

    // La pyramide des âges : catégories fédérales d'après l'année de naissance, F et H séparés.
    const referenceYear = seasonReferenceYear({ startDate: seasonStartDate, code: seasonCode });
    const ageCategories = referenceYear === null ? [] : agePyramid(agesRes, referenceYear);

    const poles = assemblePoles(polesRes);

    return c.json({
      success: true,
      data: {
        season: seasonCode,
        members: {
          currentTotal: membersRes?.currentTotal || 0,
          previousTotal: membersRes?.previousTotal || 0,
          partiallyPaid: membersRes?.partiallyPaid || 0,
          unpaidCount: membersRes?.unpaidCount || 0,
          /*
           * Renouvellement par personne : `renewed` est compté côté base, les deux autres s'en
           * déduisent — nouveaux = effectif − renouvelés, non renouvelés = n-1 − renouvelés.
           */
          renewed: membersRes?.renewed || 0,
          newcomers: (membersRes?.currentTotal || 0) - (membersRes?.renewed || 0),
          lapsed: prevSeasonId === null ? null : (membersRes?.previousTotal || 0) - (membersRes?.renewed || 0),
          ageCategories,
          /** Par groupe de la saison n-1 : effectif d'alors et personnes sans adhésion cette saison. */
          lapsedByGroup,
          /** Par groupe de la saison affichée : effectif, renouvelés (présents en n-1) et nouveaux. */
          renewalByGroup
        },
        accounting: {
          pendingChecks: checksRes?.count || 0,
          pendingDeposits: depositsRes?.count || 0,
          pendingInvoices: invoicesRes?.count || 0
        },
        expenses: {
          pendingReports: expensesRes?.count || 0
        },
        shop: {
          pendingOrders: ordersRes?.count || 0
        },
        poles
      }
    });

  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
