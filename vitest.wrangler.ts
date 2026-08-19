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
 *
 * ## Deux impasses, déjà explorées
 *
 * **Poser `remote: false` sur le binding AI plutôt que le supprimer.** Séduisant : la
 * config de test cesserait de diverger de la production, et `env.AI` resterait typé.
 * Mais le pool refuse de démarrer — « AI bindings do not support local development.
 * You can set `remote: true` […] to access a remote version of the resource. » Il n'y
 * a que deux états pour ce binding : proxy distant, ou absent. Le retirer est donc la
 * seule voie, et non un pis-aller.
 *
 * **Marquer le binding Images `remote: true`** pour que le développement local
 * reproduise fidèlement le service, notamment son repli silencieux de l'AVIF vers le
 * WebP (voir `TranscodedImage`). Même punition : « Establishing remote connection »,
 * et le temps de démarrage du pool passe de ~2,3 s à ~8,4 s. Images est émulé
 * localement par miniflare — en basse fidélité, mais suffisamment pour la mécanique —
 * donc il ne doit surtout pas porter ce drapeau. La fidélité au service réel se
 * vérifie autrement, avec un worker d'aperçu jetable.
 *
 * Mesures relevées sur `src/authz/coverage.test.ts` : 2,3 s sans binding distant,
 * 7,9 s avec le binding AI intact.
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
