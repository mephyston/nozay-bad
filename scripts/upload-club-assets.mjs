#!/usr/bin/env node
/**
 * Dépose les images du club dans R2 et inscrit leurs clés dans `club_settings`.
 *
 * Une fois par environnement, après la migration `0037_club_settings` : les images du
 * papier à lettre (bande d'en-tête, bas de page, tampon, logos partenaires) étaient
 * empaquetées dans le worker ; elles vivent désormais dans R2, comme ce que le bureau
 * dépose depuis l'écran « Images des documents ». Ce script fait ce que l'écran ferait,
 * pour les fichiers d'origine, sans passer par un navigateur.
 *
 * Les clés sont adressées par le contenu (`media/<sha256:16>/<nom>.<ext>`), exactement
 * comme `libs/domains/club/shared/assets.ts` : redéposer le même fichier donne la même
 * clé, et le site public sert l'image sous `/media/<sha>/<nom>.<ext>`.
 *
 * La signature par défaut de l'attestation CSE, elle, va dans `attestation_config`
 * (colonne base64), et seulement si aucune signature n'y est déjà.
 *
 * Usage :
 *   node scripts/upload-club-assets.mjs --target local|staging|production \
 *     [--header .data/letterhead/letterheadHeader.jpg] [--footer …] [--stamp …] \
 *     [--partner …]... [--signature …] [--dry-run]
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const dryRun = args.includes('--dry-run');
const target = opt('target', 'local');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const API_DIR = path.join(ROOT, 'apps/api');
const DEFAULTS = {
  header: '.data/letterhead/letterheadHeader.jpg',
  footer: '.data/letterhead/letterheadFooter-cropped.png',
  stamp: '.data/letterhead/stamp.jpg',
  signature: '.data/letterhead/defaultSignature.jpg'
};
const DEFAULT_PARTNERS = ['.data/letterhead/logoVilleNozay.png', '.data/letterhead/logoLardeSports.png'];

const TARGETS = {
  local: { flags: ['--local'], env: [], bucket: 'nba-media', db: 'nba-db' },
  staging: { flags: ['--remote'], env: ['--env', 'staging'], bucket: 'nba-media-staging', db: 'nba-db-staging' },
  production: { flags: ['--remote'], env: [], bucket: 'nba-media', db: 'nba-db' }
};
const t = TARGETS[target];
if (!t) throw new Error(`Cible inconnue : ${target}`);

function wrangler(cmdArgs) {
  const full = ['wrangler', ...cmdArgs, '--config', 'wrangler.json', ...t.env];
  console.log(`  $ npx ${full.join(' ')}`);
  if (dryRun) return '';
  return execFileSync('npx', full, { cwd: API_DIR, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
}

function kind(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { ext: 'png', mime: 'image/png' };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { ext: 'jpg', mime: 'image/jpeg' };
  throw new Error('Format non reconnu (PNG ou JPEG attendu)');
}

function upload(file, name) {
  const abs = path.resolve(ROOT, file);
  if (!existsSync(abs)) throw new Error(`Fichier absent : ${file}`);
  const bytes = readFileSync(abs);
  const { ext, mime } = kind(bytes);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const key = `media/${hash}/${name}.${ext}`;
  console.log(`- ${name} ← ${file} (${bytes.length} o) → ${key}`);
  wrangler(['r2', 'object', 'put', `${t.bucket}/${key}`, '--file', abs, '--content-type', mime, ...t.flags]);
  return key;
}

const sql = [];
const single = { header: 'letterhead_header_key', footer: 'letterhead_footer_key', stamp: 'stamp_key', logo: 'logo_key' };
for (const [name, column] of Object.entries(single)) {
  const file = opt(name, DEFAULTS[name]);
  if (!file || !existsSync(path.resolve(ROOT, file))) {
    console.log(`- ${name} : aucun fichier, colonne laissée telle quelle`);
    continue;
  }
  const key = upload(file, name === 'header' ? 'letterheadHeader' : name === 'footer' ? 'letterheadFooter' : name);
  sql.push(`UPDATE club_settings SET ${column} = '${key}' WHERE id = 1;`);
}

const partners = all('partner').length > 0 ? all('partner') : DEFAULT_PARTNERS.filter((f) => existsSync(path.resolve(ROOT, f)));
if (partners.length > 0) {
  const keys = partners.map((file, i) => upload(file, `partner-${i + 1}`));
  sql.push(`UPDATE club_settings SET partner_logo_keys = '${JSON.stringify(keys)}' WHERE id = 1;`);
}

const signature = opt('signature', DEFAULTS.signature);
if (signature && existsSync(path.resolve(ROOT, signature))) {
  const base64 = readFileSync(path.resolve(ROOT, signature)).toString('base64');
  console.log(`- signature ← ${signature} (${base64.length} caractères base64, seulement si aucune n'est posée)`);
  sql.push(`UPDATE attestation_config SET signature_base64 = '${base64}' WHERE id = 1 AND signature_base64 IS NULL;`);
}

if (sql.length > 0) {
  console.log('SQL :');
  for (const s of sql) console.log(`  ${s.length > 120 ? s.slice(0, 117) + '…' : s}`);
  wrangler(['d1', 'execute', t.db, '--command', sql.join(' '), ...t.flags]);
}
console.log(dryRun ? 'Simulation terminée.' : 'Terminé.');
