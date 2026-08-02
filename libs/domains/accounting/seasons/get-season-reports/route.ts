import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getSeasonReports } from './handler';
import { getSeasonReportsParamSchema } from './validator';
import { generateSeasonReportPdf, type ReportPdfType } from './generate-report-pdf';
import { listCategories } from '../../config/list-categories/handler';
import { listAccountClasses } from '../../config/list-account-classes/handler';
import { getSeasonBudget } from '../get-season-budget/handler';

export type Bindings = {
  DB: D1Database;
};

const REPORT_PDF_TYPES: ReportPdfType[] = ['income-statement', 'analytics', 'cash-flow'];

export const getSeasonReportsRoute = new Hono<{ Bindings: Bindings }>();

// PDF des rapports financiers (compte de résultat, suivi analytique, bilan de
// trésorerie), en-tête/pied de page club. Le budget prévisionnel est exclu.
getSeasonReportsRoute.get('/:seasonId/reports/pdf', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const type = (c.req.query('type') as ReportPdfType) || 'income-statement';
  if (!REPORT_PDF_TYPES.includes(type)) {
    return c.json({ success: false, error: `Type de rapport invalide : ${type}` }, 400);
  }
  const arretedAu = c.req.query('arretedAu');
  const db = createDb(c.env.DB);

  try {
    const [report, categories, accountClasses, budget] = await Promise.all([
      getSeasonReports(db, { seasonId, arretedAu }),
      listCategories(db),
      listAccountClasses(db),
      // Le prévisionnel n'apparaît que dans le compte de résultat.
      type === 'income-statement' ? getSeasonBudget(db, seasonId) : Promise.resolve([])
    ]);
    const pdf = await generateSeasonReportPdf(type, report, categories as any, accountClasses as any, budget as any);
    const filename = `rapport-${type}-${seasonId}.pdf`;
    return new Response(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Failed to generate report PDF: ' + err.message }, 500);
  }
});

getSeasonReportsRoute.get(
  '/:seasonId/reports',
  tbValidator('param', getSeasonReportsParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { seasonId } = c.req.valid('param');
    const arretedAu = c.req.query('arretedAu');
    const db = createDb(c.env.DB);
    const data = await getSeasonReports(db, { seasonId, arretedAu });
    return c.json({ success: true, data });
  }
);
