#!/usr/bin/env node
/**
 * Génère les icônes PWA des apps admin + storefront à partir d'UNE seule source :
 * l'image utilisée comme logo dans le menu (`public/logo.png`, 1024×1024).
 *
 * Pour chaque app on écrit, à l'identique, dans `public/` :
 *   - pwa/icon-192.png, pwa/icon-512.png, apple-touch-icon.png   (production, sans bandeau)
 *   - les mêmes suffixés `-dev`  avec un bandeau "DEV"  (ambre)
 *   - les mêmes suffixés `-test` avec un bandeau "TEST" (rouge)
 *
 * Le manifest (astro.config.mjs) choisit la variante selon PUBLIC_APP_ENV au build.
 *
 * Régénérer après avoir changé le logo :  node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Source unique : le logo du menu. Identique dans les deux apps (même md5).
const SOURCE = path.join(root, 'apps/admin/public/logo.png');

// Fond de marque (= theme_color / background admin) pour un rendu opaque et net
// sur les écrans d'accueil iOS (qui n'aiment pas la transparence).
const BG = { r: 0x26, g: 0x26, b: 0x24, alpha: 1 };

// Variantes d'environnement : suffixe de fichier + bandeau optionnel.
const VARIANTS = [
  { suffix: '', ribbon: null },
  { suffix: '-dev', ribbon: { text: 'DEV', color: '#d97706' } },
  { suffix: '-test', ribbon: { text: 'TEST', color: '#dc2626' } }
];

// Icônes à produire : nom de base + taille (px).
const ICONS = [
  { dir: 'pwa', base: 'icon-192', size: 192 },
  { dir: 'pwa', base: 'icon-512', size: 512 },
  { dir: '.', base: 'apple-touch-icon', size: 180 }
];

const APPS = ['apps/admin/public', 'apps/storefront/public'];

/** SVG d'un bandeau plein-largeur en bas de l'icône. */
function ribbonSvg(size, ribbon) {
  const bandH = Math.round(size * 0.26);
  const y = size - bandH;
  const fontSize = Math.round(bandH * 0.58);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${y}" width="${size}" height="${bandH}" fill="${ribbon.color}"/>
      <rect x="0" y="${y}" width="${size}" height="${Math.max(2, Math.round(size * 0.008))}" fill="#ffffff" fill-opacity="0.35"/>
      <text x="50%" y="${y + bandH / 2}" dy="0.36em" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" letter-spacing="${Math.round(fontSize * 0.08)}"
        fill="#ffffff">${ribbon.text}</text>
    </svg>`
  );
}

async function buildIcon(size, ribbon) {
  const pad = Math.round(size * 0.1); // marge autour du logo
  const logoSize = size - pad * 2;
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const layers = [{ input: logo, top: pad, left: pad }];
  if (ribbon) layers.push({ input: ribbonSvg(size, ribbon), top: 0, left: 0 });

  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toBuffer();
}

let count = 0;
for (const app of APPS) {
  for (const icon of ICONS) {
    for (const variant of VARIANTS) {
      const buf = await buildIcon(icon.size, variant.ribbon);
      const out = path.join(root, app, icon.dir, `${icon.base}${variant.suffix}.png`);
      await sharp(buf).toFile(out);
      count++;
    }
  }
}
console.log(`✓ ${count} icônes générées dans admin + storefront.`);
