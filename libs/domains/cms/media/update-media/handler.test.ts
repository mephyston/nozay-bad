import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { uploadMedia } from '../upload-media/handler';
import { updateMedia } from './handler';
import { listMedia } from '../list-media/handler';
import { getContentVersion } from '../../shared/cache-version';
import type { MediaStore } from '../upload-media/dto';

const store: MediaStore = { async has() { return false; }, async put() {} };
const bytes = (f: number) => new Uint8Array(32).fill(f).buffer;

describe('updateMedia', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('corrige le libellé sous lequel un média se retrouve', async () => {
    const media = await uploadMedia(db, store, {
      bytes: bytes(1), mimeType: 'application/pdf', alt: ''
    });

    const updated = await updateMedia(db, { mediaId: media.id, alt: 'Règlement intérieur 2023' });

    expect(updated.alt).toBe('Règlement intérieur 2023');
    expect((await listMedia(db))[0].alt).toBe('Règlement intérieur 2023');
  });

  it('ne touche ni la clé ni les octets', async () => {
    // La clé porte l'empreinte du contenu : la décrire autrement ne change pas le
    // fichier servi, et remplacer un fichier consiste à en déposer un autre.
    const media = await uploadMedia(db, store, {
      bytes: bytes(2), mimeType: 'image/png', width: 8, height: 8, alt: 'Avant'
    });

    const updated = await updateMedia(db, { mediaId: media.id, alt: 'Après' });

    expect(updated.key).toBe(media.key);
    expect(updated.contentHash).toBe(media.contentHash);
    expect(updated.sizeBytes).toBe(media.sizeBytes);
  });

  it('rogne les espaces, qui font deux libellés d’un seul', async () => {
    const media = await uploadMedia(db, store, { bytes: bytes(3), mimeType: 'application/pdf', alt: '' });
    const updated = await updateMedia(db, { mediaId: media.id, alt: '  Livret d’accueil  ' });
    expect(updated.alt).toBe('Livret d’accueil');
  });

  it('renouvelle la version du contenu, le texte alternatif étant rendu', async () => {
    const media = await uploadMedia(db, store, {
      bytes: bytes(4), mimeType: 'image/png', width: 8, height: 8, alt: 'Équipe'
    });
    const before = await getContentVersion(db);

    await updateMedia(db, { mediaId: media.id, alt: "Équipe première, saison 2025-2026" });

    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });

  it('refuse un média inexistant', async () => {
    await expect(updateMedia(db, { mediaId: 999, alt: 'Rien' })).rejects.toThrow(/introuvable/);
  });
});
