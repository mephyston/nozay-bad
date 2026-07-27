import { Hono } from 'hono';

export const dashboardRouter = new Hono<{ Bindings: { DB: D1Database } }>();

dashboardRouter.get('/overview', async (c) => {
  const db = c.env.DB;
  const seasonQuery = c.req.query('seasonId');

  try {
    let seasonId: number;
    let seasonCode: string;

    if (seasonQuery) {
      const s = await db.prepare('SELECT id, code FROM seasons WHERE code = ? OR id = ?').bind(seasonQuery, seasonQuery).first();
      if (!s) return c.json({ success: false, error: 'Season not found' }, 404);
      seasonId = s.id as number;
      seasonCode = s.code as string;
    } else {
      const s = await db.prepare('SELECT id, code FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1').first();
      if (!s) return c.json({ success: false, error: 'No active season' }, 404);
      seasonId = s.id as number;
      seasonCode = s.code as string;
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
      db.prepare(`
        SELECT
          SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as currentTotal,
          SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as previousTotal,
          SUM(CASE WHEN season_id = ? AND amount_received_cents > 0 AND amount_remaining_cents > 0 THEN 1 ELSE 0 END) as partiallyPaid
        FROM members
        WHERE season_id IN (?, ?)
      `).bind(seasonId, prevSeasonId, seasonId, seasonId, prevSeasonId),
      db.prepare("SELECT COUNT(*) as count FROM checks WHERE status = 'received' AND season_id = ?").bind(seasonId),
      db.prepare("SELECT COUNT(*) as count FROM check_deposits WHERE status = 'pending' AND season_id = ?").bind(seasonId),
      db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status = 'pending' AND season_id = ?").bind(seasonId),
      db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status IN ('draft', 'sent') AND season_id = ?").bind(seasonId),
      db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND season_id = ?").bind(seasonId),
      db.prepare(`
        SELECT c.admin_label as label, le.type, SUM(le.amount_cents) as total
        FROM ledger_entries le
        JOIN categories c ON le.category_id = c.id
        WHERE le.season_id = ?
        GROUP BY c.admin_label, le.type
      `).bind(seasonId)
    ]);

    const membersRes = batch[0].results[0] as any;
    const checksRes = batch[1].results[0] as any;
    const depositsRes = batch[2].results[0] as any;
    const expensesRes = batch[3].results[0] as any;
    const invoicesRes = batch[4].results[0] as any;
    const ordersRes = batch[5].results[0] as any;
    const polesRes = batch[6].results as any[];

    const poles = {
      events: { recettes: 0, depenses: 0, solde: 0, details: [] as any[] },
      youth: { recettes: 0, depenses: 0, solde: 0, details: [] as any[] },
      material: { recettes: 0, depenses: 0, solde: 0, details: [] as any[] },
      operations: { recettes: 0, depenses: 0, solde: 0, details: [] as any[] }
    };

    for (const row of polesRes) {
      const lbl = (row.label || '').toLowerCase();
      const amount = row.total || 0;
      const type = row.type;

      let pole: keyof typeof poles | null = null;
      if (lbl.includes('tournoi') || lbl.includes('blackminton') || lbl.includes('buvette') || lbl.includes('championnat') || lbl.includes('interclub')) {
        pole = 'events';
      } else if (lbl.includes('stage') || lbl.includes('jeune')) {
        pole = 'youth';
      } else if (lbl.includes('cordage') || lbl.includes('volant') || lbl.includes('textile') || lbl.includes('boutique') || lbl.includes('matériel') || lbl.includes('materiel')) {
        pole = 'material';
      } else if (lbl.includes('salaire') || lbl.includes('charge') || lbl.includes('licence') || lbl.includes('adhésion') || lbl.includes('adhesion') || lbl.includes('cotisation') || lbl.includes('affiliation') || lbl.includes('subvention')) {
        pole = 'operations';
      }

      if (pole) {
        if (type === 'recette') poles[pole].recettes += amount;
        if (type === 'depense') poles[pole].depenses += amount;
        
        const detail = poles[pole].details.find(d => d.label === row.label);
        if (detail) {
           if (type === 'recette') detail.recettes += amount;
           if (type === 'depense') detail.depenses += amount;
        } else {
           poles[pole].details.push({
             label: row.label,
             recettes: type === 'recette' ? amount : 0,
             depenses: type === 'depense' ? amount : 0
           });
        }
      }
    }

    for (const p of Object.values(poles)) {
      p.solde = p.recettes - p.depenses;
      if ('details' in p && Array.isArray(p.details)) {
        for (const d of p.details) {
           d.solde = d.recettes - d.depenses;
        }
        // sort by most active
        p.details.sort((a, b) => (b.recettes + b.depenses) - (a.recettes + a.depenses));
      }
    }

    return c.json({
      success: true,
      data: {
        season: seasonCode,
        members: {
          currentTotal: membersRes?.currentTotal || 0,
          previousTotal: membersRes?.previousTotal || 0,
          partiallyPaid: membersRes?.partiallyPaid || 0
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
