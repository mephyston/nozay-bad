import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Marche récursive renvoyant tous les fichiers d'un dossier.
function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) walkDir(filePath, fileList);
    else fileList.push(filePath);
  }
  return fileList;
}

const repoRoot = path.resolve(__dirname, '..');

// Slices métier (Svelte) + pages Astro : le code applicatif qui DOIT consommer @nba/ui.
const scanTargets = [
  ...walkDir(path.join(repoRoot, 'libs/domains')).filter(f => f.endsWith('.svelte')),
  ...walkDir(path.join(repoRoot, 'apps/admin/src/pages')).filter(f => f.endsWith('.astro')),
  ...walkDir(path.join(repoRoot, 'apps/storefront/src/pages')).filter(f => f.endsWith('.astro')),
  // Les composants et layouts propres aux apps suivent les mêmes règles que leurs
  // pages : ce sont eux qui portaient les dernières couleurs de palette en dur,
  // précisément parce qu'ils échappaient au scan.
  ...walkDir(path.join(repoRoot, 'apps/admin/src/components')).filter(f => /\.(astro|svelte)$/.test(f)),
  ...walkDir(path.join(repoRoot, 'apps/admin/src/layouts')).filter(f => f.endsWith('.astro')),
  ...walkDir(path.join(repoRoot, 'apps/storefront/src/components')).filter(f => /\.(astro|svelte)$/.test(f)),
  ...walkDir(path.join(repoRoot, 'apps/storefront/src/layouts')).filter(f => f.endsWith('.astro')),
  // Le site public passe par les mêmes règles : sans cette entrée il y échapperait
  // en silence, et c'est l'app la plus tentée d'écrire des couleurs en dur.
  ...walkDir(path.join(repoRoot, 'apps/website/src/pages')).filter(f => f.endsWith('.astro')),
  ...walkDir(path.join(repoRoot, 'apps/website/src/components')).filter(f => f.endsWith('.astro')),
  ...walkDir(path.join(repoRoot, 'apps/website/src/layouts')).filter(f => f.endsWith('.astro')),
];

// Documents imprimables autonomes : fond papier non theme-aware, palette littérale
// intentionnelle (le token destructive est quasi-noir en thème clair). Hors périmètre DS.
const STANDALONE_DOCUMENTS = /\[id\]\.astro$/;

function readLines(file: string): string[] {
  return fs.readFileSync(file, 'utf-8').split('\n');
}

function rel(file: string): string {
  return path.relative(repoRoot, file);
}

describe('Design System — usage rules', () => {
  it("DS1: pas de <select> brut (utiliser l'atome <Select> de @nba/ui)", () => {
    const violations: string[] = [];
    for (const file of scanTargets) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/<select[\s>]/.test(content)) violations.push(rel(file));
    }
    expect(violations, `HTML brut interdit — <select> doit être <Select>:\n${violations.join('\n')}`).toEqual([]);
  });

  it("DS2: pas de recette d'en-tête inline (utiliser <PageHeader>)", () => {
    const violations: string[] = [];
    for (const file of scanTargets) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/text-3xl font-bold tracking-tight/.test(content)) violations.push(rel(file));
    }
    expect(violations, `Bloc titre artisanal interdit — utiliser <PageHeader>:\n${violations.join('\n')}`).toEqual([]);
  });

  it("DS3: pas d'alerte destructive inline (utiliser <ErrorAlert> ou <Alert variant=\"destructive\">)", () => {
    const violations: string[] = [];
    for (const file of scanTargets) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/bg-destructive\/15/.test(content)) violations.push(rel(file));
    }
    expect(violations, `Alerte destructive artisanale interdite:\n${violations.join('\n')}`).toEqual([]);
  });

  it('DS4: pas de couleur de palette brute (utiliser les tokens sémantiques success/warning/info/destructive)', () => {
    // purple/violet = variant "ai" du DS, toléré. Échappatoire ligne: commentaire ds-allow-palette
    // sur la ligne précédente ou la ligne elle-même.
    const palette = /\b(?:text|bg|border)-(?:emerald|rose|amber|blue|red|green|yellow|sky|indigo|teal|cyan|orange|lime)-[0-9]/;
    const violations: string[] = [];
    for (const file of scanTargets) {
      if (STANDALONE_DOCUMENTS.test(file)) continue;
      const lines = readLines(file);
      lines.forEach((line, i) => {
        if (!palette.test(line)) return;
        const allowed = /ds-allow-palette/.test(line) || (i > 0 && /ds-allow-palette/.test(lines[i - 1]));
        if (!allowed) violations.push(`${rel(file)}:${i + 1}`);
      });
    }
    expect(violations, `Palette brute interdite — utiliser les tokens sémantiques:\n${violations.join('\n')}`).toEqual([]);
  });

  it('DS5: <Badge> ne porte que des classes de layout (le style passe par variant/size/shape)', () => {
    // Seules ces utilités de disposition sont tolérées dans class= sur un <Badge>.
    const LAYOUT_ALLOWED = /^(shrink-0|grow-0|flex-1|w-full|w-fit|ml-auto|mr-auto|ml-[0-9.]+|mr-[0-9.]+|mt-[0-9.]+|mb-[0-9.]+|self-(start|end|center|auto)|sm:self-(start|end|center|auto)|col-span-[0-9]+|justify-self-.*|tabular-nums|font-outfit|uppercase|whitespace-nowrap|truncate|max-w-.*|min-w-.*|no-print|print:hidden)$/;
    const violations: string[] = [];
    for (const file of scanTargets) {
      const content = fs.readFileSync(file, 'utf-8');
      // Balises <Badge ...> (multiligne) avec un class= littéral.
      for (const m of content.matchAll(/<Badge\b[^>]*?\bclass="([^"{}]*)"/gs)) {
        const tokens = m[1].trim().split(/\s+/).filter(Boolean);
        const bad = tokens.filter(t => !LAYOUT_ALLOWED.test(t));
        if (bad.length) {
          const line = content.slice(0, m.index).split('\n').length;
          violations.push(`${rel(file)}:${line} → class de style interdite: ${bad.join(' ')}`);
        }
      }
    }
    expect(violations, `Surcharge de style sur <Badge> interdite — utiliser variant/size/shape:\n${violations.join('\n')}`).toEqual([]);
  });
});
