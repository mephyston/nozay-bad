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

// Fond opaque (les écrans d'accueil iOS n'aiment pas la transparence). La couleur
// diffère par app : en production les icônes ne portent pas de bandeau, et deux
// icônes identiques étaient indistinguables sur un téléphone où les deux apps sont
// installées. Admin = anthracite de marque, Adhérent = crème clair du design system
// (le rose et le noir du logo y ressortent nettement, contrairement au terracotta
// primaire qui se confond avec le blason).
const BG_ADMIN = { r: 0x26, g: 0x26, b: 0x24, alpha: 1 };
const BG_STOREFRONT = { r: 0xfa, g: 0xf9, b: 0xf5, alpha: 1 };

// Variantes d'environnement : suffixe de fichier + couleur + mot d'env.
// Le libellé final du bandeau est « <label app> <mot env> » (ex: « Adhérent Test »).
const VARIANTS = [
  { suffix: '', word: null },
  { suffix: '-dev', word: 'Dev', color: '#d97706' },
  { suffix: '-test', word: 'Test', color: '#dc2626' }
];

// Icônes à produire : nom de base + taille (px).
const ICONS = [
  { dir: 'pwa', base: 'icon-192', size: 192 },
  { dir: 'pwa', base: 'icon-512', size: 512 },
  { dir: '.', base: 'apple-touch-icon', size: 180 }
];

// Chaque app a un libellé propre affiché dans le bandeau de l'icône.
const APPS = [
  { dir: 'apps/admin/public', label: 'Admin', bg: BG_ADMIN },
  { dir: 'apps/storefront/public', label: 'Adhérent', bg: BG_STOREFRONT }
];

/** SVG d'un bandeau plein-largeur en bas de l'icône, texte ajusté pour tenir. */
function ribbonSvg(size, text, color) {
  const bandH = Math.round(size * 0.26);
  const y = size - bandH;
  // Taille de police bornée par la hauteur du bandeau ET par la largeur dispo
  // (pour que « Adhérent Test » tienne sans déborder).
  const fontSize = Math.round(Math.min(bandH * 0.5, (size * 0.9) / (text.length * 0.58)));
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${y}" width="${size}" height="${bandH}" fill="${color}"/>
      <rect x="0" y="${y}" width="${size}" height="${Math.max(2, Math.round(size * 0.008))}" fill="#ffffff" fill-opacity="0.35"/>
      <text x="50%" y="${y + bandH / 2}" dy="0.36em" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff">${text}</text>
    </svg>`
  );
}

async function buildIcon(size, ribbon, bg) {
  const pad = Math.round(size * 0.1); // marge autour du logo
  const logoSize = size - pad * 2;
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const layers = [{ input: logo, top: pad, left: pad }];
  if (ribbon) layers.push({ input: ribbonSvg(size, ribbon.text, ribbon.color), top: 0, left: 0 });

  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite(layers)
    .png()
    .toBuffer();
}

let count = 0;
for (const app of APPS) {
  for (const icon of ICONS) {
    for (const variant of VARIANTS) {
      const ribbon = variant.word
        ? { text: `${app.label} ${variant.word}`, color: variant.color }
        : null;
      const buf = await buildIcon(icon.size, ribbon, app.bg);
      const out = path.join(root, app.dir, icon.dir, `${icon.base}${variant.suffix}.png`);
      await sharp(buf).toFile(out);
      count++;
    }
  }
}
console.log(`✓ ${count} icônes générées dans admin + storefront.`);
