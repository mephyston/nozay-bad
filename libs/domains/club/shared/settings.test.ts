import { describe, it, expect } from 'vitest';
import { SETTINGS_SECTIONS, NEUTRAL_CLUB_SETTINGS, CLUB_ASSET_COLUMNS, settingsFromRow, parsePartnerLogoKeys } from './settings';
import { clubSettingsTable } from './schema';
import { getTableColumns } from 'drizzle-orm';

describe('sections de la configuration', () => {
  /**
   * Tout ce qui se règle appartient à une section, et une seule : un champ oublié
   * n'aurait pas d'écran, un champ dans deux sections aurait deux gardes.
   */
  it('couvrent chaque champ réglable, sans doublon', () => {
    const covered = Object.values(SETTINGS_SECTIONS).flat() as string[];
    expect(new Set(covered).size).toBe(covered.length);

    const columns = Object.keys(getTableColumns(clubSettingsTable));
    const notSettable = new Set([
      'id',
      'slug', // identifiant technique, réglé par la plateforme
      'updatedByEmail',
      'updatedAt',
      'partnerLogoKeys',
      ...Object.values(CLUB_ASSET_COLUMNS) // images, déposées et non saisies
    ]);
    const settable = columns.filter((c) => !notSettable.has(c)).sort();
    expect([...covered].sort()).toEqual(settable);
  });

  it('expose un club neutre complet, sans référence à un club réel', () => {
    const columns = Object.keys(getTableColumns(clubSettingsTable)).filter((c) => c !== 'id');
    for (const c of columns) expect(NEUTRAL_CLUB_SETTINGS, c).toHaveProperty(c);
    expect(JSON.stringify(NEUTRAL_CLUB_SETTINGS)).not.toMatch(/nozay|nba ?91|essonne/i);
  });

  it('décode la liste des logos partenaires, et tolère une colonne corrompue', () => {
    expect(parsePartnerLogoKeys('["media/a/x.png","media/b/y.jpg"]')).toEqual(['media/a/x.png', 'media/b/y.jpg']);
    expect(parsePartnerLogoKeys('pas du json')).toEqual([]);
    expect(parsePartnerLogoKeys('[1, "media/a/x.png"]')).toEqual(['media/a/x.png']);
  });

  it('retire l’identifiant de la ligne lue', () => {
    const row = { ...NEUTRAL_CLUB_SETTINGS, id: 1, partnerLogoKeys: '[]' } as any;
    expect(settingsFromRow(row)).not.toHaveProperty('id');
  });
});
