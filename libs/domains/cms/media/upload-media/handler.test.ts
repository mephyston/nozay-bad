import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { uploadMedia } from './handler';
import type { MediaStore } from './dto';

/** Objet-store en mémoire : le handler ne doit rien savoir de R2. */
function memoryStore() {
  const objects = new Map<string, ArrayBuffer>();
  const store: MediaStore = {
    async has(key) { return objects.has(key); },
    async put(key, bytes) { objects.set(key, bytes); }
  };
  return { store, objects };
}

const png = (fill: number, size = 64) => new Uint8Array(size).fill(fill).buffer;

describe('uploadMedia', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('dépose le fichier et enregistre ses dimensions', async () => {
    const { store, objects } = memoryStore();
    const media = await uploadMedia(db, store, {
      bytes: png(1), mimeType: 'image/png', width: 800, height: 600, alt: 'Équipe'
    });

    expect(media.width).toBe(800);
    expect(media.height).toBe(600);
    expect(media.alt).toBe('Équipe');
    expect(objects.has(media.key)).toBe(true);
    expect(media.key).toMatch(/^media\/[a-f0-9]{16}\/original\.png$/);
  });

  it('déduplique par empreinte : le même fichier ne crée pas deux entrées', async () => {
    // C'est ce qui rend l'import rejouable, et ce qui évite la médiathèque encombrée
    // de doublons de l'ancien site.
    const { store, objects } = memoryStore();
    const first = await uploadMedia(db, store, { bytes: png(7), mimeType: 'image/png', width: 10, height: 10 });
    const second = await uploadMedia(db, store, { bytes: png(7), mimeType: 'image/png', width: 10, height: 10 });

    expect(second.id).toBe(first.id);
    expect(objects.size).toBe(1);
  });

  it('distingue deux fichiers différents', async () => {
    const { store } = memoryStore();
    const a = await uploadMedia(db, store, { bytes: png(1), mimeType: 'image/png', width: 10, height: 10 });
    const b = await uploadMedia(db, store, { bytes: png(2), mimeType: 'image/png', width: 10, height: 10 });
    expect(b.id).not.toBe(a.id);
  });

  it('refuse une image sans dimensions', async () => {
    // Sans elles, le rendu ne peut pas réserver la place et la page se décale.
    const { store } = memoryStore();
    await expect(
      uploadMedia(db, store, { bytes: png(1), mimeType: 'image/png' })
    ).rejects.toThrow(/[Dd]imensions/);
  });

  it('refuse un SVG, qui est un document exécutable', async () => {
    const { store } = memoryStore();
    await expect(
      uploadMedia(db, store, { bytes: png(1), mimeType: 'image/svg+xml', width: 10, height: 10 })
    ).rejects.toThrow(/non accepté/);
  });

  it('accepte un PDF sans dimensions', async () => {
    const { store } = memoryStore();
    const media = await uploadMedia(db, store, { bytes: png(3), mimeType: 'application/pdf' });
    expect(media.key).toMatch(/original\.pdf$/);
    expect(media.width).toBeNull();
  });

  it('refuse un fichier vide ou hors gabarit', async () => {
    const { store } = memoryStore();
    await expect(
      uploadMedia(db, store, { bytes: new ArrayBuffer(0), mimeType: 'image/png', width: 1, height: 1 })
    ).rejects.toThrow(/vide/);
    await expect(
      uploadMedia(db, store, { bytes: png(1, 13 * 1024 * 1024), mimeType: 'image/png', width: 1, height: 1 })
    ).rejects.toThrow(/volumineux/);
  });
});
