import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Le jeton `--site-header-h` et l'en-tête qu'il mesure, tenus ensemble.
 *
 * L'en-tête du site est `sticky top-0` et n'a **pas** de hauteur déclarée : elle vient
 * de son contenu. Tout ce qui se colle sous lui — aujourd'hui les deux rangs d'en-tête
 * de la grille des créneaux — part donc d'une valeur recopiée à la main, que rien dans
 * le typage ni dans le build ne relie à sa source. Le jour où le logo grandit d'un cran
 * ou où les marges changent, la bande des jours se glisserait sous l'en-tête ou
 * flotterait à quelques pixels en dessous : un défaut qui ne se voit qu'à l'œil, et
 * seulement en défilant.
 *
 * Ces contrôles ne mesurent rien — un test ne fait pas de mise en page. Ils épinglent
 * les classes dont la valeur est déduite, pour que la modifier oblige à repasser ici,
 * et de là par le jeton.
 */
const dir = __dirname;
const HEADER = fs.readFileSync(path.join(dir, 'SiteHeader.astro'), 'utf-8');
const SCHEDULE = fs.readFileSync(path.join(dir, 'blocks', 'Schedule.astro'), 'utf-8');
const GLOBAL_CSS = fs.readFileSync(path.join(dir, '..', 'styles', 'global.css'), 'utf-8');

describe('hauteur de l’en-tête collant', () => {
  it('vaut le logo, les marges et le liseré, tels que l’en-tête les pose', () => {
    // 2,5 rem de logo + 2 × 0,75 rem de marge + 2 px de liseré.
    expect(GLOBAL_CSS).toContain('--site-header-h: calc(4rem + 2px);');
    expect(HEADER).toContain('sticky top-0');
    expect(HEADER).toContain('border-b-2');
    expect(HEADER).toContain('py-3');
    // Le logo au-delà de `md` est le plus haut des enfants : c'est lui qui fait la
    // hauteur, pas le menu (`py-2` sur du `text-sm`) ni le sélecteur de thème (`md:h-9`).
    expect(HEADER).toMatch(/hidden h-10 w-10 md:block/);
  });

  it('est la seule origine des en-têtes collants de la grille des créneaux', () => {
    // Le `top` des cases — leur position dans la journée — n'a rien à voir ici.
    const tops = [...SCHEDULE.matchAll(/^\s*top:\s*([^;]+);/gm)]
      .map((match) => match[1].trim())
      .filter((top) => !top.includes('var(--top)'));
    expect(tops).toEqual([
      'var(--site-header-h)',
      'var(--site-header-h)',
      'calc(var(--site-header-h) + var(--day-head-h))'
    ]);
  });
});
