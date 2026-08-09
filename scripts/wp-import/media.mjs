import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import { readWxr, publicPath } from './wxr.mjs';

/**
 * Transcodage des médias repris de WordPress.
 *
 * On ne traite que les fichiers **réellement référencés** par le contenu retenu :
 * l'export en compte 736, dont un quart seulement est utilisé. Uploader le reste
 * remplirait R2 de fichiers que personne n'atteindra.
 *
 * Les variantes sont produites une fois pour toutes, ici : les Workers n'ont pas de
 * bibliothèque d'image et l'offre gratuite exclut la transformation à la volée.
 */

const WXR = '.data/wp/nozaybadmintonassociation.WordPress.2026-08-08.xml';
const UPLOADS = '.data/wp/uploads';
const OUT = '.data/wp/media';
const MANIFEST = '.data/wp/media-manifest.json';

const WIDTHS = [400, 800, 1200, 1600];
const AVIF_QUALITY = 50;
const WEBP_QUALITY = 75;

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf'
};

/** Ramène une vignette WordPress à son original : `photo-800x600.jpg` → `photo.jpg`. */
export function toOriginal(relative) {
  return relative.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
}

/** Médias cités par le contenu que l'on importe. */
export function referencedMedia(items, keptPaths) {
  const refs = new Set();
  const content = items.filter(
    (i) => ['post', 'page'].includes(i.type) && i.status === 'publish' && keptPaths.has(publicPath(i))
  );

  for (const item of content) {
    for (const m of (item.body ?? '').matchAll(/wp-content\/uploads\/([^"')\s>\\]+)/g)) {
      refs.add(toOriginal(decodeURIComponent(m[1])));
    }
  }

  // Images à la une : elles ne figurent pas dans le corps, mais illustrent les listes.
  const featured = new Set(
    content.map((i) => Number(i.meta?._thumbnail_id)).filter((n) => Number.isSafeInteger(n) && n > 0)
  );
  for (const a of items) {
    if (a.type !== 'attachment' || !featured.has(a.id)) continue;
    const m = (a.attachmentUrl ?? '').match(/wp-content\/uploads\/(.+)$/);
    if (m) refs.add(toOriginal(decodeURIComponent(m[1])));
  }
  return refs;
}

function hashOf(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

async function transcode(buffer, hash, extension) {
  const produced = [];
  const image = sharp(buffer, { failOn: 'none' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error('dimensions illisibles');

  for (const width of WIDTHS) {
    // Jamais d'agrandissement : produire un 1600 depuis un 800 ajoute du poids sans
    // ajouter de détail.
    if (width > meta.width) continue;
    for (const [format, options] of [
      ['avif', { quality: AVIF_QUALITY }],
      ['webp', { quality: WEBP_QUALITY }]
    ]) {
      const data = await sharp(buffer).resize({ width }).toFormat(format, options).toBuffer();
      const height = Math.round((meta.height / meta.width) * width);
      const key = `media/${hash}/${width}.${format}`;
      writeFileSync(join(OUT, key.replace('media/', '')), data);
      produced.push({ key, format, width, height, sizeBytes: data.length });
    }
  }
  return { width: meta.width, height: meta.height, variants: produced };
}

async function main() {
  const items = readWxr(WXR);

  const csv = readFileSync('.data/wp/inventaire.csv', 'utf-8').split('\n').slice(1).filter(Boolean);
  const kept = new Set();
  for (const line of csv) {
    const cols = (line.match(/"((?:[^"]|"")*)"/g) ?? []).map((c) => c.slice(1, -1).replace(/""/g, '"'));
    if (cols[6] === 'importer') kept.add(cols[1]);
  }

  const refs = [...referencedMedia(items, kept)].sort();
  mkdirSync(OUT, { recursive: true });

  const manifest = [];
  let missing = 0;
  let skipped = 0;

  for (const relative of refs) {
    const source = join(UPLOADS, relative);
    if (!existsSync(source)) { missing++; continue; }

    const buffer = readFileSync(source);
    const hash = hashOf(buffer);
    const extension = (relative.split('.').pop() ?? '').toLowerCase();
    const mimeType = MIME[extension];
    if (!mimeType) { skipped++; continue; }

    mkdirSync(join(OUT, hash), { recursive: true });
    const originalKey = `media/${hash}/original.${extension}`;
    writeFileSync(join(OUT, `${hash}/original.${extension}`), buffer);

    const entry = {
      source: relative, hash, key: originalKey, mimeType,
      sizeBytes: buffer.length, width: null, height: null, variants: []
    };

    if (mimeType !== 'application/pdf') {
      try {
        const result = await transcode(buffer, hash, extension);
        entry.width = result.width;
        entry.height = result.height;
        entry.variants = result.variants;
      } catch (error) {
        // Une image illisible n'a pas de dimensions, donc pas de réservation de place :
        // on la signale plutôt que de livrer un décalage de mise en page.
        console.warn(`  ⚠ ${relative} : ${error.message}`);
        skipped++;
        continue;
      }
    }
    manifest.push(entry);
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  const originals = manifest.reduce((n, m) => n + m.sizeBytes, 0);
  const variants = manifest.reduce((n, m) => n + m.variants.reduce((s, v) => s + v.sizeBytes, 0), 0);
  const objects = manifest.length + manifest.reduce((n, m) => n + m.variants.length, 0);

  console.log(`référencés     ${refs.length}`);
  console.log(`  traités      ${manifest.length}`);
  console.log(`  introuvables ${missing}`);
  console.log(`  écartés      ${skipped}`);
  console.log('');
  console.log(`objets à déposer : ${objects}`);
  console.log(`  originaux  ${(originals / 1e6).toFixed(1)} Mo`);
  console.log(`  variantes  ${(variants / 1e6).toFixed(1)} Mo`);
  console.log(`manifeste → ${MANIFEST}`);
}

main();
