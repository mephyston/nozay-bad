import { Hono } from 'hono';
import { membersRouter } from '@nba/members-api';
import { accountingRouter } from '@nba/accounting-api';
import { expensesRouter } from '@nba/expenses-api';
import { shopRouter } from '@nba/shop-api';
import { iamRouter } from '@nba/iam';
import { notificationsRouter } from '@nba/notifications-api';
import { aiRouter } from './ai';
import { dashboardRouter } from './dashboard';
import { handleScheduled, type ScheduledBindings } from './scheduled';
import { notificationsSendRouter } from './notifications';
import { AppError } from '@nba/db';
import { authorize } from './authz/middleware';

type Bindings = {
  DB: D1Database;
  AI: any;
  INTERNAL_API_KEY?: string;
  RBAC_ENFORCE?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Comparaison à temps constant (F-01) : évite un canal temporel sur la clé d'API.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  console.error({ url: c.req.url, err: err?.message || String(err), stack: err?.stack });
  return c.json({ success: false, error: 'Erreur interne du serveur' }, 500);
});

// Middleware d'authentification stricte par clé d'API partagée
app.use('*', async (c, next) => {
  if (c.req.path === '/health') {
    return next();
  }

  // C-01 : aucune valeur en dur. La clé provient exclusivement du secret du Worker
  // (wrangler secret put) ou, en local, de .dev.vars (gitignoré). Fail-closed sinon.
  const apiKey = c.env?.INTERNAL_API_KEY || '';

  // Échec en fermeture : clé non configurée sur le Worker
  if (!apiKey) {
    console.error('INTERNAL_API_KEY is not configured in worker environment');
    return c.json({ success: false, error: 'Erreur de configuration serveur' }, 500);
  }

  const reqKey =
    c.req.header('x-api-key') ||
    c.req.header('x-internal-secret') ||
    c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';

  if (timingSafeEqual(reqKey, apiKey)) {
    return next();
  }

  // M-02 : ne jamais journaliser la clé (reçue ou attendue). Statut + présence seulement.
  console.error(`401 Unauthorized path=${c.req.path} keyProvided=${Boolean(reqKey)}`);
  return c.json({ success: false, error: 'Accès non autorisé' }, 401);
});

// Autorisation par route, fermée par défaut. Elle vient APRÈS le contrôle de clé :
// la clé prouve que l'appelant est un Worker de confiance, ce qui est la condition
// pour croire l'identité qu'il affirme.
app.use('*', authorize());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Mount routers
app.route('/members', membersRouter);
app.route('/accounting', accountingRouter);
app.route('/expenses', expensesRouter);
app.route('/shop', shopRouter);
app.route('/iam', iamRouter);
app.route('/notifications', notificationsRouter);
app.route('/notifications', notificationsSendRouter);
app.route('/dashboard', dashboardRouter);
app.route('/ai', aiRouter);

// Application Hono exposée pour les tests, qui appellent `app.request()`.
export { app };

// Le Worker expose deux points d'entrée : les requêtes HTTP (Hono) et les Cron
// Triggers, qui drainent la file d'envoi des notifications push.
export default {
  fetch: app.fetch,
  scheduled: (event: ScheduledController, env: ScheduledBindings) => handleScheduled(event, env)
};
