import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const run = promisify(execFile);

/**
 * Dépôt des médias sur R2.
 *
 * `wrangler r2 object put` prend ~1,7 s par objet : pour un millier de fichiers, le
 * séquentiel demanderait une demi-heure. On parallélise, et on tient un journal des
 * clés déposées pour que l'opération soit reprenable — une coupure réseau au 800ᵉ
 * fichier ne doit pas obliger à tout refaire.
 */

const MANIFEST = '.data/wp/media-manifest.json';
const STATE = '.data/wp/media-uploaded.json';
const ROOT = '.data/wp/media';
const BUCKET = process.argv[2] ?? 'nba-media-staging';
const CONCURRENCY = 8;

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
const done = new Set(existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf-8')) : []);

/** Tous les objets à déposer : originaux et variantes. */
const objects = [];
for (const entry of manifest) {
  objects.push({ key: entry.key, mimeType: entry.mimeType });
  for (const variant of entry.variants) {
    objects.push({ key: variant.key, mimeType: `image/${variant.format}` });
  }
}

const pending = objects.filter((o) => !done.has(o.key));
console.log(`${objects.length} objets, ${done.size} déjà déposés, ${pending.length} à faire`);

let uploaded = 0;
let failed = 0;
const failures = [];

async function put(object) {
  const file = join(ROOT, object.key.replace(/^media\//, ''));
  try {
    await run('npx', [
      'wrangler', 'r2', 'object', 'put', `${BUCKET}/${object.key}`,
      '--file', file, '--content-type', object.mimeType, '--remote'
    ], { timeout: 120000 });
    done.add(object.key);
    uploaded++;
  } catch (error) {
    failed++;
    failures.push({ key: object.key, error: String(error.message ?? error).slice(0, 120) });
  }
  const total = uploaded + failed;
  if (total % 50 === 0) {
    process.stdout.write(`  ${total}/${pending.length} (${failed} échec(s))\n`);
    writeFileSync(STATE, JSON.stringify([...done]));
  }
}

/** File d'attente à parallélisme borné : `Promise.all` sur mille processus tuerait la machine. */
async function main() {
  const queue = [...pending];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const object = queue.shift();
      if (object) await put(object);
    }
  });
  await Promise.all(workers);

  writeFileSync(STATE, JSON.stringify([...done]));
  console.log(`\ndéposés ${uploaded} · échecs ${failed}`);
  for (const f of failures.slice(0, 10)) console.log(`  ✗ ${f.key} — ${f.error}`);
  if (failed > 0) process.exitCode = 1;
}

main();
