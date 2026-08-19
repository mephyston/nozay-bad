#!/usr/bin/env node
/**
 * Produit les logos servis par le site public, à partir des masters PNG.
 *
 * Les masters vivent dans `apps/website/assets/` et **non** dans `public/` : tout ce
 * qui est déposé dans `public/` est copié tel quel dans le bundle déployé, et les
 * masters font 1024×1024 pour un logo affiché à 36 px. Le site en servait 482 Kio
 * pour 4 pastilles — l'essentiel des « économies estimées » que relevait PageSpeed.
 *
 * Chaque master donne un WebP dimensionné à 3× sa taille d'affichage CSS, ce qui
 * couvre les écrans jusqu'à DPR 3 sans jamais dépasser la douzaine de kilo-octets.
 * On ne garde pas de repli PNG : WebP est reconnu par tous les navigateurs visés.
 *
 * Le favicon est un cas à part. Il était une copie octet pour octet de `logo.png`,
 * soit 200 Kio pour une pastille d'onglet, et il reste en PNG : les icônes de favori
 * ne passent pas par le même chemin de négociation de format que les images de page.
 *
 * Les variantes sombres des masters sont produites par `scripts/make-dark-logo.py`,
 * qu'on ne rejoue qu'au changement du logo.
 *
 * Régénérer après avoir changé un master :  node scripts/generate-website-logos.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ASSETS = path.join(root, 'apps/website/assets');
const PUBLIC = path.join(root, 'apps/website/public');

// `display` est la plus grande taille CSS à laquelle le fichier est rendu. L'écusson
// seul ne sert qu'en dessous de `md` (h-9) ; la version complète sert dans l'en-tête
// à partir de `md` (h-10) et, pour la variante sombre, dans le pied de page (h-12).
const LOGOS = [
  { name: 'logo', display: 36 },
  { name: 'logo-dark', display: 36 },
  { name: 'logo-large', display: 40 },
  { name: 'logo-large-dark', display: 48 }
];

const DPR = 3;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

for (const { name, display } of LOGOS) {
  const size = display * DPR;
  const resized = sharp(path.join(ASSETS, `${name}.png`)).resize(size, size, {
    fit: 'contain',
    background: TRANSPARENT
  });

  // Le sans-perte l'emporte parfois sur un aplat de logo, parfois non : on encode les
  // deux et on garde le plus léger plutôt que de trancher à l'aveugle.
  const [lossy, lossless] = await Promise.all([
    resized.clone().webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer(),
    resized.clone().webp({ lossless: true, effort: 6 }).toBuffer()
  ]);
  const best = lossless.length < lossy.length ? lossless : lossy;

  await sharp(best).toFile(path.join(PUBLIC, `${name}.webp`));
  console.log(`  ${name}.webp`.padEnd(26) + `${size}×${size}  ${(best.length / 1024).toFixed(1)} Kio`);
}

const favicon = await sharp(path.join(ASSETS, 'logo.png'))
  .resize(96, 96)
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
await sharp(favicon).toFile(path.join(PUBLIC, 'favicon.png'));
console.log('  favicon.png'.padEnd(26) + `96×96  ${(favicon.length / 1024).toFixed(1)} Kio`);

console.log('✓ Logos du site régénérés.');
