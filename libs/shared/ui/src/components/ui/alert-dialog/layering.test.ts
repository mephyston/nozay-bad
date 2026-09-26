import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Une confirmation passe au-dessus de ce qui l'a demandée.
 *
 * `GlobalConfirm` est monté une fois, avec la mise en page ; les tiroirs et les
 * feuilles d'actions s'ouvrent ensuite. À niveau égal, c'est l'ordre dans le document
 * qui tranche, et il donnait le tiroir gagnant : sur téléphone, la boîte « Retirer ce
 * bloc ? » s'ouvrait sous l'éditeur de page, invisible, et le bouton semblait mort.
 *
 * Le test compare les niveaux écrits dans les sources, faute de rendu : c'est la
 * seule chose qu'un changement de classe puisse casser sans que rien d'autre ne le voie.
 */

const UI = path.resolve(__dirname, '../..');
const read = (relative: string) => fs.readFileSync(path.join(UI, relative), 'utf-8');

/**
 * Tous les niveaux `z-*` d'un fichier, `z-50` comme `z-[60]`.
 *
 * Commentaires retirés d'abord : celui qui explique ce choix cite les niveaux voisins.
 */
function zLevels(source: string): number[] {
  const code = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...code.matchAll(/\bz-(?:\[(\d+)\]|(\d+))/g)].map((m) => Number(m[1] ?? m[2]));
}

const confirmLevels = [
  ...zLevels(read('ui/alert-dialog/alert-dialog-overlay.svelte')),
  ...zLevels(read('ui/alert-dialog/alert-dialog-content.svelte'))
];

describe('empilement de la boîte de confirmation', () => {
  it.each([
    'patterns/ResponsiveSheet.svelte',
    'patterns/ActionSheet.svelte',
    'patterns/ChoicePicker.svelte',
    'ui/sheet/sheet-content.svelte',
    'ui/dialog/dialog-content.svelte'
  ])('passe au-dessus de %s', (surface) => {
    const lowest = Math.min(...confirmLevels);
    const highest = Math.max(...zLevels(read(surface)));
    expect(lowest, `confirmation à z-${lowest}, ${surface} à z-${highest}`).toBeGreaterThan(highest);
  });
});
