import { describe, it, expect, vi, afterEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { app } from './index';
import {
  CRON_TRIGGERS,
  FREE_PLAN_LIMITS,
  aggregateUsage,
  clearPlatformUsageCache,
  historyDates,
  parseHistoryDays,
  startOfUtcDay,
  type UsageAccountData
} from './platform-usage';
import { TEST_ADMIN_EMAIL, seedTestAdmin } from './authz/test-identity';
// Importée et non lue sur le disque : les tests de l'API tournent dans le runtime
// Workers, dont le système de fichiers est virtuel.
import wranglerConfig from '../wrangler.json';

/**
 * La page de consommation de la plateforme.
 *
 * Deux choses s'y trompent en silence : les unités — l'API rend des microsecondes, et
 * une confusion avec les millisecondes ferait passer 166 ms pour 0,17 ms, soit un worker
 * parfaitement sain là où il frôle la limite — et le compte des crons, qu'aucune API
 * n'expose et qui dériverait à la première ajoutée dans un `wrangler.json`.
 */

const KEY = 'secret123';
const ADMIN = {
  'x-api-key': KEY,
  'x-caller': 'admin',
  'x-user-email': TEST_ADMIN_EMAIL
};

function env(mockD1: unknown, extra: Record<string, string> = {}) {
  return { DB: mockD1, INTERNAL_API_KEY: KEY, OPEN_PLAY_ENABLED: 'false', ...extra };
}

const CONFIGURED = {
  CLOUDFLARE_ANALYTICS_TOKEN: 'jeton-de-test',
  CLOUDFLARE_ACCOUNT_ID: 'compte-de-test'
};

function graphqlResponse(account: UsageAccountData) {
  return new Response(JSON.stringify({ data: { viewer: { accounts: [account] } } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

afterEach(() => {
  clearPlatformUsageCache();
  vi.unstubAllGlobals();
});

describe('startOfUtcDay', () => {
  it('ramène à minuit UTC, où les quotas quotidiens se rouvrent', () => {
    expect(startOfUtcDay(new Date('2026-08-29T15:47:03.221Z'))).toBe('2026-08-29T00:00:00.000Z');
  });
});

describe('parseHistoryDays', () => {
  it('accepte les trois paliers proposés', () => {
    expect(parseHistoryDays('7')).toBe(7);
    expect(parseHistoryDays('15')).toBe(15);
    expect(parseHistoryDays('30')).toBe(30);
  });

  it('retombe sur sept devant n’importe quoi d’autre', () => {
    // 60 est refusé par Cloudflare lui-même (fenêtre maximale de 4 semaines et 4 jours) :
    // le laisser passer transformerait un paramètre d'URL bricolé en erreur 502.
    expect(parseHistoryDays('60')).toBe(7);
    expect(parseHistoryDays('tout')).toBe(7);
    expect(parseHistoryDays(undefined)).toBe(7);
    expect(parseHistoryDays(null)).toBe(7);
  });
});

describe('historyDates', () => {
  it('rend la fenêtre du plus ancien à aujourd’hui, bornes comprises', () => {
    const dates = historyDates(new Date('2026-08-29T15:00:00Z'), 7);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-08-23');
    expect(dates[6]).toBe('2026-08-29');
  });

  it('franchit un changement de mois sans trou', () => {
    const dates = historyDates(new Date('2026-09-02T00:30:00Z'), 4);
    expect(dates).toEqual(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
  });
});

describe('CRON_TRIGGERS', () => {
  /**
   * Le seul garde-fou possible : la liste est écrite à la main faute d'API, et cinq
   * crons par compte est la limite la plus proche du bord.
   */
  it('correspond aux crons réellement déclarés dans apps/api/wrangler.json', () => {
    const wrangler = wranglerConfig as {
      name: string;
      triggers?: { crons?: string[] };
      env: { staging: { name: string; triggers?: { crons?: string[] } } };
    };

    const declared = new Map<string, number>([
      [wrangler.name, wrangler.triggers?.crons?.length ?? 0],
      [wrangler.env.staging.name, wrangler.env.staging.triggers?.crons?.length ?? 0]
    ]);

    for (const { worker, schedules } of CRON_TRIGGERS) {
      expect(declared.get(worker), worker).toBe(schedules);
    }
    expect(CRON_TRIGGERS.length).toBe(declared.size);
  });

  it('reste sous la limite de cinq par compte', () => {
    const total = CRON_TRIGGERS.reduce((sum, c) => sum + c.schedules, 0);
    expect(total).toBeLessThanOrEqual(FREE_PLAN_LIMITS.cronTriggersPerAccount);
  });
});

describe('aggregateUsage', () => {
  const account: UsageAccountData = {
    workersInvocationsAdaptive: [
      {
        dimensions: { scriptName: 'nba-api', status: 'success' },
        sum: { requests: 100, errors: 0, subrequests: 10 },
        quantiles: { cpuTimeP50: 4483, cpuTimeP99: 22521 }
      },
      {
        dimensions: { scriptName: 'nba-api', status: 'clientDisconnected' },
        sum: { requests: 5, errors: 0, subrequests: 0 },
        quantiles: { cpuTimeP50: 900, cpuTimeP99: 90000 }
      },
      {
        dimensions: { scriptName: 'nba-website', status: 'success' },
        sum: { requests: 400, errors: 2, subrequests: 500 },
        quantiles: { cpuTimeP50: 3943, cpuTimeP99: 57118 }
      }
    ],
    d1AnalyticsAdaptiveGroups: [
      {
        dimensions: { databaseId: 'prod' },
        sum: { rowsRead: 419792, rowsWritten: 151, readQueries: 7494, writeQueries: 61 }
      },
      {
        dimensions: { databaseId: 'staging' },
        sum: { rowsRead: 17148, rowsWritten: 0, readQueries: 4790, writeQueries: 0 }
      }
    ]
  };

  const usage = aggregateUsage(account, '2026-08-29T00:00:00.000Z');

  it('convertit les microsecondes en millisecondes', () => {
    const api = usage.workers.find((w) => w.script === 'nba-api')!;
    expect(api.cpuP50Ms).toBe(4.5);
  });

  it('retient le pire quantile plutôt que d’en faire une moyenne dénuée de sens', () => {
    const api = usage.workers.find((w) => w.script === 'nba-api')!;
    expect(api.cpuP99Ms).toBe(90);
  });

  it('réunit les statuts d’un même worker sans perdre les requêtes', () => {
    const api = usage.workers.find((w) => w.script === 'nba-api')!;
    expect(api.requests).toBe(105);
    expect(api.statuses).toEqual([
      { status: 'success', requests: 100 },
      { status: 'clientDisconnected', requests: 5 }
    ]);
  });

  it('classe les workers du plus demandé au moins demandé', () => {
    expect(usage.workers.map((w) => w.script)).toEqual(['nba-website', 'nba-api']);
  });

  it('totalise ce qui se compare à un quota', () => {
    expect(usage.totals.workerRequests).toBe(505);
    expect(usage.totals.d1RowsRead).toBe(436940);
    expect(usage.totals.d1RowsWritten).toBe(151);
    expect(usage.totals.cronTriggers).toBe(4);
  });

  it('garde leur place aux jours sans activité', () => {
    // Cloudflare n'envoie aucune ligne pour un jour creux : sans le calendrier construit
    // à part, le graphique collerait la veille à l'avant-veille et la creusée deviendrait
    // invisible.
    const avecTrou = aggregateUsage(
      {
        workersDaily: [
          {
            dimensions: { date: '2026-08-27', scriptName: 'nba-api' },
            sum: { requests: 900 },
            quantiles: { cpuTimeP50: 4000, cpuTimeP75: 8000, cpuTimeP90: 15000, cpuTimeP95: 20000, cpuTimeP99: 30000 }
          },
          {
            dimensions: { date: '2026-08-29', scriptName: 'nba-api' },
            sum: { requests: 500 },
            quantiles: { cpuTimeP50: 2000, cpuTimeP75: 3000, cpuTimeP90: 6000, cpuTimeP95: 9000, cpuTimeP99: 12000 }
          }
        ],
        d1Daily: [
          { dimensions: { date: '2026-08-29' }, sum: { rowsRead: 1200, rowsWritten: 30 } }
        ]
      },
      '2026-08-29T00:00:00.000Z',
      ['2026-08-27', '2026-08-28', '2026-08-29']
    );

    expect(avecTrou.history.days).toBe(3);
    expect(avecTrou.history.series).toEqual([
      { date: '2026-08-27', workerRequests: 900, d1RowsRead: 0, d1RowsWritten: 0, cpuP50Ms: 4, cpuP75Ms: 8, cpuP90Ms: 15, cpuP95Ms: 20, cpuP99Ms: 30 },
      { date: '2026-08-28', workerRequests: 0, d1RowsRead: 0, d1RowsWritten: 0, cpuP50Ms: 0, cpuP75Ms: 0, cpuP90Ms: 0, cpuP95Ms: 0, cpuP99Ms: 0 },
      { date: '2026-08-29', workerRequests: 500, d1RowsRead: 1200, d1RowsWritten: 30, cpuP50Ms: 2, cpuP75Ms: 3, cpuP90Ms: 6, cpuP95Ms: 9, cpuP99Ms: 12 }
    ]);
  });

  it('ne filtre que le CPU quand un worker est choisi', () => {
    const deuxWorkers = {
      workersDaily: [
        {
          dimensions: { date: '2026-08-29', scriptName: 'nba-api' },
          sum: { requests: 300 },
          quantiles: { cpuTimeP50: 2000, cpuTimeP75: 3000, cpuTimeP90: 4000, cpuTimeP95: 5000, cpuTimeP99: 6000 }
        },
        {
          dimensions: { date: '2026-08-29', scriptName: 'nba-admin' },
          sum: { requests: 40 },
          quantiles: { cpuTimeP50: 14000, cpuTimeP75: 25000, cpuTimeP90: 42000, cpuTimeP95: 60000, cpuTimeP99: 130000 }
        }
      ]
    };

    const admin = aggregateUsage(deuxWorkers, '2026-08-29T00:00:00.000Z', ['2026-08-29'], 'nba-admin');

    // Le CPU est celui de l'admin seul…
    expect(admin.history.series[0].cpuP50Ms).toBe(14);
    expect(admin.history.series[0].cpuP99Ms).toBe(130);
    // …mais les requêtes restent celles du compte : elles ne se filtrent pas par worker
    // sans devenir incomparables aux quotas, qui sont globaux.
    expect(admin.history.series[0].workerRequests).toBe(340);
    expect(admin.history.workers).toEqual(['nba-admin', 'nba-api']);
    expect(admin.history.worker).toBe('nba-admin');
  });

  it('supporte un compte sans aucune activité', () => {
    const vide = aggregateUsage({}, '2026-08-29T00:00:00.000Z');
    expect(vide.workers).toEqual([]);
    expect(vide.totals.workerRequests).toBe(0);
  });
});

describe('GET /platform/usage', () => {
  it("annonce l'installation incomplète plutôt qu'une panne quand le jeton manque", async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    const res = await app.request('/platform/usage', { headers: ADMIN }, env(mockD1));
    const body = (await res.json()) as { success: boolean; data: { configured: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.configured).toBe(false);
  });

  it('sert les chiffres du compte, puis les resert sans réinterroger Cloudflare', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    const fetchMock = vi.fn(async () =>
      graphqlResponse({
        workersInvocationsAdaptive: [
          {
            dimensions: { scriptName: 'nba-api', status: 'success' },
            sum: { requests: 42, errors: 0, subrequests: 0 },
            quantiles: { cpuTimeP50: 1000, cpuTimeP99: 2000 }
          }
        ]
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await app.request('/platform/usage', { headers: ADMIN }, env(mockD1, CONFIGURED));
    const body = (await first.json()) as { data: { totals: { workerRequests: number } } };
    expect(body.data.totals.workerRequests).toBe(42);

    await app.request('/platform/usage', { headers: ADMIN }, env(mockD1, CONFIGURED));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sert chaque période depuis sa propre entrée de cache', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    const fetchMock = vi.fn(async () => graphqlResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    const sept = await app.request(
      '/platform/usage?periode=7',
      { headers: ADMIN },
      env(mockD1, CONFIGURED)
    );
    const trente = await app.request(
      '/platform/usage?periode=30',
      { headers: ADMIN },
      env(mockD1, CONFIGURED)
    );

    expect(((await sept.json()) as { data: { history: { days: number } } }).data.history.days).toBe(7);
    expect(((await trente.json()) as { data: { history: { days: number } } }).data.history.days).toBe(30);
    // Deux fenêtres, deux interrogations : la seconde ne se déduit pas de la première.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('remonte une erreur GraphQL, que Cloudflare rend sous un code 200', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ errors: [{ message: 'authentication error' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
      )
    );

    const res = await app.request('/platform/usage', { headers: ADMIN }, env(mockD1, CONFIGURED));
    expect(res.status).toBe(502);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: expect.stringContaining('authentication error')
    });
  });

  it('reste fermée à un appelant de service', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    const res = await app.request(
      '/platform/usage',
      { headers: { 'x-api-key': KEY, 'x-caller': 'storefront' } },
      env(mockD1, CONFIGURED)
    );

    expect(res.status).toBe(403);
  });
});
