import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';

/**
 * Élagage de l'historique des actualités.
 *
 * Le club ne conserve que les actualités de la saison en cours. Les précédentes — 90
 * articles repris de WordPress — sont retirées, leurs adresses passées en `410 Gone`,
 * et les médias qu'elles étaient seules à porter effacés de R2.
 *
 * **Ce n'est pas une migration, et ça ne doit pas en devenir une.** Une migration
 * s'applique partout et ne se rejoue pas ; ceci est une décision d'exploitation, prise
 * pour un environnement, à une date donnée. Le dépôt tient déjà cette ligne pour la
 * reprise WordPress : le contenu n'est pas du schéma.
 *
 * À blanc par défaut. `--apply` est le seul mode qui écrit.
 *
 *   node scripts/prune-posts.mjs --env=local
 *   node scripts/prune-posts.mjs --env=staging
 *   node scripts/prune-posts.mjs --env=staging --apply
 */

const run = promisify(execFile);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const CUTOFF = args.before ?? '2025-09-01';
const ENV = args.env ?? 'local';
const APPLY = args.apply === true;

const TARGETS = {
  local: { db: 'nba-db', bucket: null, flags: ['--local'] },
  staging: { db: 'nba-db-staging', bucket: 'nba-media-staging', flags: ['--remote', '--env', 'staging'] },
  production: { db: 'nba-db', bucket: 'nba-media', flags: ['--remote'] }
};

const target = TARGETS[ENV];
if (!target) {
  console.error(`--env doit valoir ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const cutoffSeconds = Math.floor(new Date(`${CUTOFF}T00:00:00Z`).getTime() / 1000);
if (!Number.isSafeInteger(cutoffSeconds)) {
  console.error(`--before illisible : ${CUTOFF}`);
  process.exit(1);
}

/** Lecture D1 via wrangler : le seul chemin qui vaut en local comme à distance. */
function query(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json',
     ...target.flags, '--json', '--command', sql],
    { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
  );
  // wrangler préfixe parfois la sortie de lignes d'information : on repart du premier `[`.
  const json = out.slice(out.indexOf('['));
  return JSON.parse(json)[0]?.results ?? [];
}

const q = (value) => (value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`);

async function main() {
  console.log(`Environnement : ${ENV} · base ${target.db} · coupure ${CUTOFF}\n`);

  // --- Ce qui part ---------------------------------------------------------
  const doomed = query(
    `SELECT id, path, title, published_at FROM cms_posts
     WHERE status = 'published' AND published_at IS NOT NULL AND published_at < ${cutoffSeconds}
     ORDER BY published_at`
  );
  const kept = query(
    `SELECT COUNT(*) AS n FROM cms_posts
     WHERE status = 'published' AND (published_at IS NULL OR published_at >= ${cutoffSeconds})`
  )[0]?.n;
  const drafts = query(`SELECT COUNT(*) AS n FROM cms_posts WHERE status = 'draft'`)[0]?.n;

  console.log(`Actualités supprimées : ${doomed.length}`);
  console.log(`Actualités conservées : ${kept} publiée(s), ${drafts} brouillon(s) intact(s)\n`);
  if (doomed.length === 0) {
    console.log('Rien à faire.');
    return;
  }

  const doomedIds = new Set(doomed.map((p) => p.id));

  /*
    Médias devenus orphelins.

    Volontairement **plus strict** que `delete-media`, qui ne regarde que les clés
    étrangères (couverture d'article, image de partage d'une page). Un média inséré
    dans le corps d'un texte ou dans un bloc de page n'y figure pas : le supprimer
    laisserait une image cassée sans que rien ne l'ait signalé. On balaie donc aussi
    le HTML stocké.
  */
  const media = query('SELECT id, key FROM cms_media');
  const survivors = [
    ...query(
      `SELECT body_html AS html, cover_media_id AS cover FROM cms_posts
       WHERE id NOT IN (${[...doomedIds].join(',')})`
    ),
    ...query('SELECT payload AS html, NULL AS cover FROM cms_page_blocks'),
    ...query('SELECT NULL AS html, og_image_media_id AS cover FROM cms_pages')
  ];

  /**
   * Identifiants de médias cités par une charge utile de bloc.
   *
   * Indispensable, et facile à manquer : une galerie, un carrousel ou un document ne
   * citent pas d'adresse `/media/…`, mais un **nombre** (`mediaId`, `mediaIds`,
   * `backgroundMediaId`, `thumbnailMediaId`). S'en tenir aux adresses supprimerait les
   * images d'une galerie en laissant la page pointer des identifiants morts.
   */
  function mediaIdsInPayload(json) {
    const found = [];
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (/mediaIds?$/i.test(key)) {
          for (const v of Array.isArray(value) ? value : [value]) {
            if (Number.isSafeInteger(v) && v > 0) found.push(v);
          }
        }
        walk(value);
      }
    };
    try {
      walk(JSON.parse(json));
    } catch {
      /* Ligne illisible : elle sera ignorée par le rendu aussi. */
    }
    return found;
  }

  const stillUsed = new Set();
  for (const row of survivors) {
    if (row.cover) stillUsed.add(Number(row.cover));
    const html = String(row.html ?? '');
    // Adresses insérées dans du texte riche…
    for (const m of html.matchAll(/\/media\/([a-f0-9]{8,})\//g)) stillUsed.add(m[1]);
    // …et identifiants portés par les blocs.
    for (const id of mediaIdsInPayload(html)) stillUsed.add(id);
  }

  const orphans = media.filter(
    (m) => !stillUsed.has(m.id) && !stillUsed.has(m.key.split('/')[1])
  );

  const variantKeys = orphans.length
    ? query(`SELECT key FROM cms_media_variants WHERE media_id IN (${orphans.map((o) => o.id).join(',')})`)
    : [];

  console.log(`Médias orphelins : ${orphans.length} original(aux) + ${variantKeys.length} variante(s)`);
  console.log(`Médias conservés : ${media.length - orphans.length}\n`);

  // --- Le SQL --------------------------------------------------------------
  const sql = [
    `-- Élagage des actualités antérieures au ${CUTOFF}.`,
    `-- Généré par scripts/prune-posts.mjs. ${doomed.length} article(s), ${orphans.length} média(s).`,
    ''
  ];

  // Les 410 d'abord : une adresse qui a existé et n'a pas de successeur sort de
  // l'index de Google bien plus vite ainsi qu'en 404 muet.
  for (const post of doomed) {
    sql.push(
      `INSERT OR IGNORE INTO cms_redirects (from_path, to_path, status_code, hit_count, note, created_at) ` +
      `VALUES (${q(post.path)}, NULL, 410, 0, 'actualité archivée', CAST(strftime('%s','now') AS INTEGER));`
    );
  }
  const ids = [...doomedIds].join(',');
  sql.push('', `DELETE FROM cms_post_category_links WHERE post_id IN (${ids});`);
  sql.push(`DELETE FROM cms_posts WHERE id IN (${ids});`);

  if (orphans.length) {
    const orphanIds = orphans.map((o) => o.id).join(',');
    sql.push('', `DELETE FROM cms_media_variants WHERE media_id IN (${orphanIds});`);
    sql.push(`DELETE FROM cms_media WHERE id IN (${orphanIds});`);
  }

  mkdirSync('.data', { recursive: true });
  writeFileSync('.data/prune-posts.sql', sql.join('\n') + '\n');
  const keys = [...orphans.map((o) => o.key), ...variantKeys.map((v) => v.key)];
  writeFileSync('.data/prune-posts-r2.txt', keys.join('\n') + '\n');

  console.log('SQL     → .data/prune-posts.sql');
  console.log('Clés R2 → .data/prune-posts-r2.txt');
  console.log('\nExemples d’adresses passant en 410 :');
  for (const post of doomed.slice(0, 5)) console.log(`  ${post.path}`);
  if (doomed.length > 5) console.log(`  … et ${doomed.length - 5} autres`);

  if (!APPLY) {
    console.log('\n— Passage à blanc. Relancez avec --apply pour exécuter. —');
    return;
  }

  // --- Exécution -----------------------------------------------------------
  console.log('\nApplication du SQL…');
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json',
     ...target.flags, '--file', '.data/prune-posts.sql'],
    { stdio: 'inherit' }
  );

  if (!target.bucket) {
    console.log('\nPas de bucket R2 en local : les fichiers restent sur disque.');
    return;
  }

  /*
    Suppression R2, à parallélisme borné.

    `wrangler r2 object delete` prend près de deux secondes par objet : pour un millier
    de clés, le séquentiel demanderait une demi-heure et se ferait interrompre bien
    avant. Même remède que pour le dépôt initial (`upload-r2.mjs`) — une file à huit
    ouvriers — et un journal des clés traitées pour que l'opération soit reprenable.
  */
  console.log(`\nSuppression de ${keys.length} objet(s) sur ${target.bucket}…`);

  const queue = [...keys];
  const failures = [];
  let removed = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const key = queue.shift();
      if (!key) return;
      try {
        await run('npx', ['wrangler', 'r2', 'object', 'delete', `${target.bucket}/${key}`, '--remote'], {
          timeout: 120000
        });
        removed++;
      } catch (error) {
        // Un objet déjà absent n'est pas un échec : le script doit rester rejouable.
        failures.push({ key, error: String(error.message ?? error).slice(0, 120) });
      }
      const done = removed + failures.length;
      if (done % 50 === 0) console.log(`  ${done}/${keys.length} (${failures.length} échec(s))`);
    }
  };

  await Promise.all(Array.from({ length: 8 }, worker));

  console.log(`\n${removed}/${keys.length} objet(s) supprimé(s).`);
  for (const f of failures.slice(0, 10)) console.log(`  ✗ ${f.key} — ${f.error}`);
  if (failures.length > 10) console.log(`  … et ${failures.length - 10} autres échecs`);
}

main();
