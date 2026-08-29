import { Hono } from 'hono';

/**
 * Consommation de la plateforme Cloudflare, rapportée aux quotas du plan gratuit.
 *
 * Ce que le tableau de bord de Cloudflare ne montre nulle part, c'est le **pourcentage
 * de quota** : il affiche des courbes, pas une distance au mur. Or le mode d'échec du
 * plan gratuit n'est pas une facture, c'est un arrêt — au-delà des 100 000 requêtes
 * quotidiennes le Worker rend une erreur 1027, au-delà des 5 millions de lignes lues D1
 * refuse les requêtes, et tout redémarre à minuit UTC. Savoir qu'on est à 15 % ou à
 * 90 % est la seule information qui compte, et c'est celle qu'il fallait aller calculer
 * à la main.
 *
 * La source est l'API GraphQL d'analytique de Cloudflare, interrogée avec un jeton **à
 * portée compte** posé en secret (`CLOUDFLARE_ANALYTICS_TOKEN`). Il est en lecture
 * seule, mais il voit tout le compte : c'est pourquoi la route est réservée à
 * `settings:platform:read`.
 */

/** Fenêtre d'observation : les quotas quotidiens de Cloudflare se rouvrent à minuit UTC. */
export function startOfUtcDay(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

/**
 * Seuils du plan gratuit.
 *
 * Codés ici plutôt que devinés : aucune API ne les expose. À reprendre le jour où le
 * compte passe au plan payant — les requêtes deviennent alors 10 millions par mois, et
 * la question change de nature.
 */
export const FREE_PLAN_LIMITS = {
  workerRequestsPerDay: 100_000,
  d1RowsReadPerDay: 5_000_000,
  d1RowsWrittenPerDay: 100_000,
  cronTriggersPerAccount: 5
} as const;

/**
 * Déclencheurs cron configurés, par worker.
 *
 * Aucun jeu de données d'analytique ne dit combien de crons sont *déclarés* — seulement
 * combien se sont exécutés. Or c'est la limite la plus proche du bord (cinq par compte,
 * erreur API 10072 au-delà) et la seule que personne ne regarde jamais. La liste est donc
 * tenue à la main, et `platform-usage.test.ts` la compare aux `wrangler.json` : elle ne
 * peut pas dériver en silence.
 */
export const CRON_TRIGGERS: readonly { worker: string; schedules: number }[] = [
  { worker: 'nba-api', schedules: 3 },
  { worker: 'nba-api-staging', schedules: 1 }
];

export interface WorkerUsage {
  script: string;
  requests: number;
  errors: number;
  subrequests: number;
  /** Millisecondes : l'API rend des microsecondes, que personne ne lit d'un coup d'œil. */
  cpuP50Ms: number;
  cpuP99Ms: number;
  /** `success`, `clientDisconnected`, `exceededCpu`… — hors `success`, à regarder. */
  statuses: { status: string; requests: number }[];
}

export interface DatabaseUsage {
  databaseId: string;
  rowsRead: number;
  rowsWritten: number;
  readQueries: number;
  writeQueries: number;
}

export interface PlatformUsage {
  /** Faux quand le jeton manque : la page l'explique au lieu d'afficher une erreur. */
  configured: boolean;
  since: string;
  workers: WorkerUsage[];
  databases: DatabaseUsage[];
  totals: {
    workerRequests: number;
    d1RowsRead: number;
    d1RowsWritten: number;
    cronTriggers: number;
  };
  limits: typeof FREE_PLAN_LIMITS;
}

interface InvocationRow {
  dimensions: { scriptName: string; status: string };
  sum: { requests: number; errors: number; subrequests: number };
  quantiles: { cpuTimeP50: number | null; cpuTimeP99: number | null };
}

interface DatabaseRow {
  dimensions: { databaseId: string };
  sum: { rowsRead: number; rowsWritten: number; readQueries: number; writeQueries: number };
}

export interface UsageAccountData {
  workersInvocationsAdaptive?: InvocationRow[];
  d1AnalyticsAdaptiveGroups?: DatabaseRow[];
}

const QUERY = `
query($account: String!, $since: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(limit: 200, filter: { datetime_geq: $since }) {
        dimensions { scriptName status }
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
      }
      d1AnalyticsAdaptiveGroups(limit: 50, filter: { datetime_geq: $since }) {
        dimensions { databaseId }
        sum { rowsRead rowsWritten readQueries writeQueries }
      }
    }
  }
}`;

const MICROSECONDS_PER_MS = 1000;

function roundMs(microseconds: number): number {
  return Math.round((microseconds / MICROSECONDS_PER_MS) * 10) / 10;
}

/**
 * Agrège les lignes brutes en un état lisible.
 *
 * Les quantiles ne s'additionnent pas — la moyenne de deux p99 ne veut rien dire. Un
 * worker apparaissant sur plusieurs lignes (une par statut), on retient donc **le plus
 * élevé** : c'est le pire cas observé, et c'est bien lui qu'on veut voir approcher d'une
 * limite.
 */
export function aggregateUsage(account: UsageAccountData, since: string): PlatformUsage {
  const workers = new Map<string, WorkerUsage>();

  for (const row of account.workersInvocationsAdaptive ?? []) {
    const name = row.dimensions.scriptName;
    const worker = workers.get(name) ?? {
      script: name,
      requests: 0,
      errors: 0,
      subrequests: 0,
      cpuP50Ms: 0,
      cpuP99Ms: 0,
      statuses: []
    };
    worker.requests += row.sum.requests;
    worker.errors += row.sum.errors;
    worker.subrequests += row.sum.subrequests;
    worker.cpuP50Ms = Math.max(worker.cpuP50Ms, roundMs(row.quantiles.cpuTimeP50 ?? 0));
    worker.cpuP99Ms = Math.max(worker.cpuP99Ms, roundMs(row.quantiles.cpuTimeP99 ?? 0));

    const existing = worker.statuses.find((s) => s.status === row.dimensions.status);
    if (existing) existing.requests += row.sum.requests;
    else worker.statuses.push({ status: row.dimensions.status, requests: row.sum.requests });

    workers.set(name, worker);
  }

  const databases = (account.d1AnalyticsAdaptiveGroups ?? []).map((row) => ({
    databaseId: row.dimensions.databaseId,
    rowsRead: row.sum.rowsRead,
    rowsWritten: row.sum.rowsWritten,
    readQueries: row.sum.readQueries,
    writeQueries: row.sum.writeQueries
  }));

  const ordered = [...workers.values()].sort((a, b) => b.requests - a.requests);
  for (const worker of ordered) worker.statuses.sort((a, b) => b.requests - a.requests);

  return {
    configured: true,
    since,
    workers: ordered,
    databases: databases.sort((a, b) => b.rowsRead - a.rowsRead),
    totals: {
      workerRequests: ordered.reduce((sum, w) => sum + w.requests, 0),
      d1RowsRead: databases.reduce((sum, d) => sum + d.rowsRead, 0),
      d1RowsWritten: databases.reduce((sum, d) => sum + d.rowsWritten, 0),
      cronTriggers: CRON_TRIGGERS.reduce((sum, c) => sum + c.schedules, 0)
    },
    limits: FREE_PLAN_LIMITS
  };
}

/**
 * Cache de la réponse, à l'échelle de l'isolate.
 *
 * L'API GraphQL de Cloudflare est lente et limitée en débit, et ses chiffres sont eux
 * mêmes agrégés à la minute : rafraîchir plus souvent que ça ne montrerait rien de plus.
 * Cinq minutes est aussi ce qui empêche un rechargement compulsif de la page de peser
 * plus lourd que ce qu'il mesure.
 */
const TTL_MS = 5 * 60_000;
let cached: { payload: PlatformUsage; expiresAt: number } | null = null;

export function clearPlatformUsageCache(): void {
  cached = null;
}

export class AnalyticsApiError extends Error {}

export async function fetchUsage(
  token: string,
  account: string,
  now: Date = new Date()
): Promise<PlatformUsage> {
  const since = startOfUtcDay(now);

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { account, since } })
  });

  if (!response.ok) {
    throw new AnalyticsApiError(`API d'analytique Cloudflare : HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    data?: { viewer?: { accounts?: UsageAccountData[] } };
    errors?: { message: string }[];
  };

  // GraphQL répond 200 même sur une erreur : un jeton sans la portée compte ressort
  // ici, et pas au code HTTP.
  if (body.errors?.length) {
    throw new AnalyticsApiError(body.errors.map((e) => e.message).join(' ; '));
  }

  return aggregateUsage(body.data?.viewer?.accounts?.[0] ?? {}, since);
}

export type PlatformUsageBindings = {
  CLOUDFLARE_ANALYTICS_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};

export const platformRouter = new Hono<{ Bindings: PlatformUsageBindings }>();

platformRouter.get('/usage', async (c) => {
  const token = c.env?.CLOUDFLARE_ANALYTICS_TOKEN;
  const account = c.env?.CLOUDFLARE_ACCOUNT_ID;

  // Jeton absent : ce n'est pas une panne, c'est une installation incomplète. La page
  // le dit et donne la commande à lancer, plutôt que d'afficher une erreur muette.
  if (!token || !account) {
    return c.json({
      success: true,
      data: {
        configured: false,
        since: startOfUtcDay(new Date()),
        workers: [],
        databases: [],
        totals: { workerRequests: 0, d1RowsRead: 0, d1RowsWritten: 0, cronTriggers: 0 },
        limits: FREE_PLAN_LIMITS
      } satisfies PlatformUsage
    });
  }

  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return c.json({ success: true, data: cached.payload });
  }

  try {
    const payload = await fetchUsage(token, account);
    cached = { payload, expiresAt: now + TTL_MS };
    return c.json({ success: true, data: payload });
  } catch (err) {
    console.error({
      msg: "lecture de l'analytique Cloudflare impossible",
      err: err instanceof Error ? err.message : String(err)
    });
    return c.json(
      { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' },
      502
    );
  }
});
