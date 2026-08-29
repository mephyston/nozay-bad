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

/**
 * Périodes d'historique proposées.
 *
 * Plafonnées par Cloudflare, qui refuse une fenêtre de plus de 4 semaines et 4 jours sur
 * ces jeux de données — 30 est donc le dernier palier possible, pas un choix esthétique.
 */
export const HISTORY_CHOICES = [7, 15, 30] as const;

export function parseHistoryDays(raw: string | undefined | null): number {
  const value = Number(raw);
  return (HISTORY_CHOICES as readonly number[]).includes(value) ? value : HISTORY_CHOICES[0];
}

/**
 * Les jours de la fenêtre, du plus ancien à aujourd'hui.
 *
 * Construits ici plutôt que déduits des lignes reçues : un jour sans la moindre requête
 * n'apparaît pas dans la réponse de Cloudflare, et le graphique le ferait disparaître —
 * une journée creuse se lirait alors comme une journée normale, collée à sa voisine.
 */
export function historyDates(now: Date, days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

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
  /**
   * Consommation jour par jour, indépendante des jauges.
   *
   * Les jauges répondent « où en suis-je du quota d'aujourd'hui » ; l'historique répond
   * « est-ce que ça dérive ». Ce sont deux questions distinctes, et confondre les deux —
   * additionner trente jours pour les rapporter à une limite quotidienne — donnerait un
   * pourcentage qui ne veut rien dire.
   */
  history: { days: number; series: DayPoint[] };
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

interface DailyInvocationRow {
  dimensions: { date: string };
  sum: { requests: number };
}

interface DailyDatabaseRow {
  dimensions: { date: string };
  sum: { rowsRead: number; rowsWritten: number };
}

export interface UsageAccountData {
  workersInvocationsAdaptive?: InvocationRow[];
  d1AnalyticsAdaptiveGroups?: DatabaseRow[];
  workersDaily?: DailyInvocationRow[];
  d1Daily?: DailyDatabaseRow[];
}

/** Un jour de la fenêtre d'historique. */
export interface DayPoint {
  date: string;
  workerRequests: number;
  d1RowsRead: number;
  d1RowsWritten: number;
}

/*
  Deux séries volontairement séparées plutôt qu'une seule croisée.

  Le détail par worker ne porte pas la date, l'historique ne porte pas le worker : croiser
  les deux ferait une quinzaine de workers fois quatre statuts fois trente jours, soit
  près de deux mille lignes pour afficher trente barres.
*/
const QUERY = `
query($account: String!, $since: Time!, $historySince: Time!) {
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
      workersDaily: workersInvocationsAdaptive(limit: 500, filter: { datetime_geq: $historySince }) {
        dimensions { date }
        sum { requests }
      }
      d1Daily: d1AnalyticsAdaptiveGroups(limit: 500, filter: { datetime_geq: $historySince }) {
        dimensions { date }
        sum { rowsRead rowsWritten }
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
export function aggregateUsage(
  account: UsageAccountData,
  since: string,
  dates: readonly string[] = []
): PlatformUsage {
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

  // Somme par jour, puis projection sur le calendrier complet : les jours sans activité
  // valent zéro et gardent leur place, plutôt que de disparaître du graphique.
  const requestsByDay = new Map<string, number>();
  for (const row of account.workersDaily ?? []) {
    requestsByDay.set(
      row.dimensions.date,
      (requestsByDay.get(row.dimensions.date) ?? 0) + row.sum.requests
    );
  }
  const d1ByDay = new Map<string, { read: number; written: number }>();
  for (const row of account.d1Daily ?? []) {
    const day = d1ByDay.get(row.dimensions.date) ?? { read: 0, written: 0 };
    day.read += row.sum.rowsRead;
    day.written += row.sum.rowsWritten;
    d1ByDay.set(row.dimensions.date, day);
  }

  const series: DayPoint[] = dates.map((date) => ({
    date,
    workerRequests: requestsByDay.get(date) ?? 0,
    d1RowsRead: d1ByDay.get(date)?.read ?? 0,
    d1RowsWritten: d1ByDay.get(date)?.written ?? 0
  }));

  return {
    configured: true,
    since,
    history: { days: dates.length, series },
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
/** Une entrée par période : les trois fenêtres ne se déduisent pas l'une de l'autre. */
const cached = new Map<number, { payload: PlatformUsage; expiresAt: number }>();

export function clearPlatformUsageCache(): void {
  cached.clear();
}

export class AnalyticsApiError extends Error {}

export async function fetchUsage(
  token: string,
  account: string,
  days: number = HISTORY_CHOICES[0],
  now: Date = new Date()
): Promise<PlatformUsage> {
  const since = startOfUtcDay(now);
  const dates = historyDates(now, days);
  const historySince = `${dates[0]}T00:00:00.000Z`;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { account, since, historySince } })
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

  return aggregateUsage(body.data?.viewer?.accounts?.[0] ?? {}, since, dates);
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
  const days = parseHistoryDays(c.req.query('periode'));

  if (!token || !account) {
    return c.json({
      success: true,
      data: {
        configured: false,
        since: startOfUtcDay(new Date()),
        history: { days, series: [] },
        workers: [],
        databases: [],
        totals: { workerRequests: 0, d1RowsRead: 0, d1RowsWritten: 0, cronTriggers: 0 },
        limits: FREE_PLAN_LIMITS
      } satisfies PlatformUsage
    });
  }

  const now = Date.now();
  const hit = cached.get(days);
  if (hit && hit.expiresAt > now) {
    return c.json({ success: true, data: hit.payload });
  }

  try {
    const payload = await fetchUsage(token, account, days);
    cached.set(days, { payload, expiresAt: now + TTL_MS });
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
