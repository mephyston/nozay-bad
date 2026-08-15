#!/usr/bin/env node
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Rattrapage des déclinaisons d'images manquantes.
 *
 * `upload-media` produit désormais son échelle au dépôt, mais tout ce qui a été
 * déposé depuis l'administration avant cela n'en a aucune : seule la reprise
 * WordPress en avait écrit. Ces images-là sont servies en original — jusqu'à 1600 px
 * de large pour une vignette rendue à 380 — et le resteraient indéfiniment, rien dans
 * l'administration ne permettant de les réclamer.
 *
 * **Ce n'est pas une migration.** Comme `prune-posts.mjs`, c'est une opération
 * d'exploitation : elle vise un environnement, se rejoue sans dommage, et ne
 * s'applique pas d'elle-même au déploiement.
 *
 * Le transcodage passe par `sharp` en local, et non par le binding Images du Worker :
 * le rattrapage traite des centaines d'images d'un coup, et il n'y a aucune raison de
 * dépenser le quota mensuel de transformations pour un travail qu'une machine de
 * développement fait gratuitement. Les réglages sont ceux de la reprise WordPress
 * (`scripts/wp-import/media.mjs`), pour que les trois chemins de production —
 * import, dépôt, rattrapage — rendent des fichiers comparables.
 *
 * À blanc par défaut. `--apply` est le seul mode qui écrit.
 *
 *   node scripts/backfill-media-variants.mjs --env=local
 *   node scripts/backfill-media-variants.mjs --env=staging
 *   node scripts/backfill-media-variants.mjs --env=staging --apply
 */

const run = promisify(execFile);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ENV = args.env ?? 'local';
const APPLY = args.apply === true;

/*
  En local, un seul ouvrier.

  Les commandes `wrangler … --local` opèrent toutes sur le même état miniflare sur
  disque : lancées en parallèle, elles se le disputent et échouent au hasard — un lot
  de six en perdait deux ou trois à chaque passage. À distance le problème n'existe
  pas, chaque commande parlant à l'API, et c'est justement le cas où la parallélisation
  compte : `wrangler r2 object put` prend près de deux secondes par objet.
*/
const CONCURRENCY = ENV === 'local' ? 1 : 6;

/** Doit rester aligné sur `VARIANT_WIDTHS` / `VARIANT_FORMATS` de `libs/domains/cms/shared/media.ts`. */
const WIDTHS = [400, 800, 1200, 1600];
const AVIF_QUALITY = 50;
const WEBP_QUALITY = 75;

/** Types que le dépôt décline. Aligné sur `isTranscodableImage` : ni GIF, ni PDF. */
const TRANSCODABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

const TARGETS = {
  local: { db: 'nba-db', bucket: null, flags: ['--local'], r2Flags: ['--local'] },
  staging: {
    db: 'nba-db-staging', bucket: 'nba-media-staging',
    flags: ['--remote', '--env', 'staging'], r2Flags: ['--remote']
  },
  production: { db: 'nba-db', bucket: 'nba-media', flags: ['--remote'], r2Flags: ['--remote'] }
};

const target = TARGETS[ENV];
if (!target) {
  console.error(`--env doit valoir ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const WORK = '.data/backfill-variants';
const SQL_FILE = join(WORK, `${ENV}.sql`);

/** Lecture D1 via wrangler : le seul chemin qui vaut en local comme à distance. */
function query(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json',
     ...target.flags, '--json', '--command', sql],
    { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
  );
  // wrangler préfixe parfois la sortie de lignes d'information : on repart du premier `[`.
  return JSON.parse(out.slice(out.indexOf('[')))[0]?.results ?? [];
}

const q = (value) => (value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`);

/**
 * Récupère l'original depuis R2.
 *
 * Par `wrangler r2 object get` plutôt que par l'URL publique : le rattrapage doit
 * pouvoir tourner sur un environnement dont le site n'est pas joignable, et sur des
 * médias qu'aucune page ne référence encore.
 */
async function fetchOriginal(key, destination) {
  const bucket = target.bucket ?? 'nba-media';
  await run('npx', [
    'wrangler', 'r2', 'object', 'get', `${bucket}/${key}`,
    '--config', 'apps/api/wrangler.json', '--file', destination, ...target.r2Flags
  ], { timeout: 120000 });
}

/**
 * Même échelle et mêmes qualités qu'à la reprise : jamais d'agrandissement.
 *
 * `sharp` honore toujours le format demandé, là où le binding Images abandonne parfois
 * l'AVIF au profit du WebP sur les grandes largeurs — le dépôt écarte alors ce barreau
 * (voir `TranscodedImage`). Une même image peut donc avoir une échelle AVIF plus
 * complète par rattrapage que par dépôt. Ce n'est pas une incohérence à corriger :
 * chaque `<source>` porte son propre `srcset`, et un barreau de plus est un barreau de
 * mieux.
 */
async function transcode(buffer, contentHash, sourceWidth, sourceHeight) {
  const produced = [];
  for (const width of WIDTHS) {
    if (width > sourceWidth) continue;
    for (const [format, options] of [
      ['avif', { quality: AVIF_QUALITY }],
      ['webp', { quality: WEBP_QUALITY }]
    ]) {
      const data = await sharp(buffer).resize({ width }).toFormat(format, options).toBuffer();
      const file = join(WORK, 'out', `${contentHash}-${width}.${format}`);
      writeFileSync(file, data);
      produced.push({
        key: `media/${contentHash}/${width}.${format}`,
        format,
        width,
        height: Math.round((sourceHeight / sourceWidth) * width),
        sizeBytes: data.length,
        file,
        mimeType: `image/${format}`
      });
    }
  }
  return produced;
}

async function main() {
  console.log(`Environnement : ${ENV} · base ${target.db}\n`);

  /*
    Images sans la moindre déclinaison.

    `NOT EXISTS` et non `LEFT JOIN … IS NULL` : une image partiellement déclinée — un
    rattrapage interrompu — doit être reprise, et c'est `INSERT OR IGNORE` côté SQL qui
    absorbe les lignes déjà écrites.
  */
  const pending = query(
    `SELECT m.id, m.key, m.mime_type AS mimeType, m.width, m.height, m.content_hash AS contentHash
     FROM cms_media m
     WHERE m.mime_type LIKE 'image/%'
       AND m.width IS NOT NULL AND m.height IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM cms_media_variants v WHERE v.media_id = m.id)
     ORDER BY m.id`
  ).filter((row) => TRANSCODABLE.has(row.mimeType));

  const total = query(`SELECT COUNT(*) AS n FROM cms_media WHERE mime_type LIKE 'image/%'`)[0]?.n;
  console.log(`Images en base : ${total}`);
  console.log(`Sans déclinaison, transcodables : ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('Rien à faire.');
    return;
  }

  mkdirSync(join(WORK, 'out'), { recursive: true });

  /*
    La reprise ne tient pas de journal : elle relit la base.

    Un fichier d'état marquant les images « traitées » après transcodage mentirait —
    le SQL n'est appliqué qu'à la toute fin, et seulement si tous les dépôts R2 ont
    réussi. Une exécution interrompue entre les deux aurait laissé des images notées
    faites, sans la moindre ligne en base, et la relance les aurait sautées. La requête
    `NOT EXISTS` ci-dessus dit la vérité à chaque passage : ce qui n'a pas de variante
    est à refaire, et le retranscodage local ne coûte que du temps machine.
  */
  const todo = pending;

  // --- Transcodage, à parallélisme borné ------------------------------------
  const queue = [...todo];
  const variants = [];
  const failures = [];
  let processed = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const media = queue.shift();
      if (!media) return;
      const source = join(WORK, `src-${media.id}`);
      try {
        // `cms_media.key` porte déjà le préfixe `media/`, qui est aussi celui de R2.
        await fetchOriginal(media.key, source);
        const buffer = readFileSync(source);
        variants.push(...(await transcode(buffer, media.contentHash, media.width, media.height)));
      } catch (error) {
        failures.push({ id: media.id, key: media.key, error: String(error.message ?? error).slice(0, 140) });
      } finally {
        rmSync(source, { force: true });
      }
      processed++;
      if (processed % 20 === 0) process.stdout.write(`  ${processed}/${todo.length}\n`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const bytes = variants.reduce((n, v) => n + v.sizeBytes, 0);
  console.log(`\n${variants.length} variante(s) produite(s) · ${(bytes / 1e6).toFixed(1)} Mo`);
  if (failures.length > 0) {
    console.log(`${failures.length} image(s) en échec :`);
    for (const f of failures.slice(0, 10)) console.log(`  ✗ ${f.key} — ${f.error}`);
  }
  if (variants.length === 0) return;

  // --- SQL ------------------------------------------------------------------
  const byHash = new Map(pending.map((m) => [m.contentHash, m.id]));
  const sql = [
    '-- Rattrapage des déclinaisons. Généré par scripts/backfill-media-variants.mjs.',
    '-- INSERT OR IGNORE : le script doit pouvoir être rejoué sans buter sur l’unicité de `key`.',
    ''
  ];
  for (const v of variants) {
    const mediaId = byHash.get(v.key.split('/')[1]);
    sql.push(
      `INSERT OR IGNORE INTO cms_media_variants (media_id, format, width, height, size_bytes, key) VALUES ` +
      `(${mediaId}, ${q(v.format)}, ${v.width}, ${v.height}, ${v.sizeBytes}, ${q(v.key)});`
    );
  }
  writeFileSync(SQL_FILE, sql.join('\n') + '\n');
  console.log(`\nSQL     → ${SQL_FILE}`);
  console.log(`Fichiers → ${join(WORK, 'out')}`);

  if (!APPLY) {
    console.log('\n— Passage à blanc. Relancez avec --apply pour exécuter. —');
    return;
  }

  // --- Dépôt R2 puis écriture en base ---------------------------------------
  // R2 d'abord : une ligne sans objet donne une image cassée, un objet sans ligne ne
  // fait qu'occuper de la place que le prochain élagage récupérera.
  console.log(`\nDépôt de ${variants.length} objet(s)…`);
  const uploadQueue = [...variants];
  let uploaded = 0;
  const uploadFailures = [];

  const uploader = async () => {
    while (uploadQueue.length > 0) {
      const v = uploadQueue.shift();
      if (!v) return;
      try {
        await run('npx', [
          'wrangler', 'r2', 'object', 'put', `${target.bucket ?? 'nba-media'}/${v.key}`,
          '--config', 'apps/api/wrangler.json',
          '--file', v.file, '--content-type', v.mimeType, ...target.r2Flags
        ], { timeout: 120000 });
        uploaded++;
      } catch (error) {
        uploadFailures.push({ key: v.key, error: String(error.message ?? error).slice(0, 140) });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, uploader));
  console.log(`déposés ${uploaded} · échecs ${uploadFailures.length}`);
  for (const f of uploadFailures.slice(0, 10)) console.log(`  ✗ ${f.key} — ${f.error}`);

  if (uploadFailures.length > 0) {
    console.error('\nDépôt incomplet : le SQL n’est pas appliqué. Relancez le script.');
    process.exitCode = 1;
    return;
  }

  console.log('\nApplication du SQL…');
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json',
     ...target.flags, '--file', SQL_FILE],
    { stdio: 'inherit' }
  );

  // Le HTML du site est mis en cache une heure, et la clé porte cette version : sans
  // ce coup de pouce, les pages continueraient de servir leur balisage sans `srcset`.
  console.log('\nIncrémentation de cms_content_version…');
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json', ...target.flags,
     '--command', 'UPDATE cms_content_version SET version = version + 1, updated_at = unixepoch() WHERE id = 1;'],
    { stdio: 'inherit' }
  );

  console.log('\n✓ Rattrapage terminé.');
}

main();
