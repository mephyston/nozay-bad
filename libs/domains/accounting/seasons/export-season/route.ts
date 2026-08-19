import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { exportSeasonArchive } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const exportSeasonRoute = new Hono<{ Bindings: Bindings }>();

exportSeasonRoute.get('/seasons/:season/export', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  
  const season = c.req.param('season');
  const db = createDb(c.env.DB);
  
  const type = c.req.query('type') as any || 'all';
  
  try {
    const exportResult = await exportSeasonArchive(db, season, type);
    
    return new Response(exportResult.data as any, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Failed to generate archive: ' + err.message }, 500);
  }
});
