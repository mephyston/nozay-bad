import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Chemin d'une config wrangler pour les TESTS, dérivée de apps/api/wrangler.json
 * en retirant le binding `ai`.
 *
 * Pourquoi : le binding AI force le pool `@cloudflare/vitest-pool-workers` à ouvrir
 * une session proxy DISTANTE (miniflare n'émule pas Workers AI) → ~5× plus lent,
 * `CLOUDFLARE_API_TOKEN` requis en CI, et charges d'usage AI possibles. Or AUCUN test
 * n'utilise le binding AI du pool : les routes AI (accounting) et apps/api injectent
 * toutes leur propre mock via `route.request(url, init, { AI: mockAI })`.
 *
 * Le fichier généré reste dans apps/api/ pour préserver les chemins relatifs de la
 * config (`main`, `migrations_dir`). Il est gitignoré et régénéré à chaque run.
 */
export function wranglerTestConfigPath(): string {
  const src = path.resolve(__dirname, 'apps/api/wrangler.json');
  const cfg = JSON.parse(fs.readFileSync(src, 'utf8'));
  delete cfg.ai;
  if (cfg.env?.staging) delete cfg.env.staging.ai;
  const out = path.resolve(__dirname, 'apps/api/wrangler.test.json');
  fs.writeFileSync(out, JSON.stringify(cfg, null, 2));
  return out;
}
