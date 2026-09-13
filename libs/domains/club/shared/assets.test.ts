import { describe, it, expect } from 'vitest';
import { isSafeMediaKey } from '@nba/cms/public';
import { clubAssetFileName, clubAssetKey, clubAssetPath, CLUB_MEDIA_PREFIX } from './assets';

describe('clés des images du club', () => {
  it("produit des clés que le site public accepte de servir, quel que soit le nom de l'image", () => {
    // Le nom d'une image est celui de son emplacement (`letterheadHeader`) : en camelCase,
    // il tombait hors de `isSafeMediaKey` et l'aperçu de l'en-tête répondait 404.
    for (const name of ['logo', 'letterheadHeader', 'letterheadFooter', 'stamp', 'partner-1', 'Mon Logo (v2)']) {
      const key = clubAssetKey('0123456789abcdef', name, 'image/png');
      expect(key.startsWith(CLUB_MEDIA_PREFIX)).toBe(true);
      expect(isSafeMediaKey(key.slice(CLUB_MEDIA_PREFIX.length)), key).toBe(true);
      expect(clubAssetPath(key)).toBe(`/media/${key.slice(CLUB_MEDIA_PREFIX.length)}`);
    }
    expect(clubAssetFileName('letterheadHeader')).toBe('letterhead-header');
    expect(clubAssetKey('0123456789abcdef', 'stamp', 'image/jpeg')).toBe('media/0123456789abcdef/stamp.jpg');
  });
});
