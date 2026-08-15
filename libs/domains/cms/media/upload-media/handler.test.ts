import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { cmsMediaVariantsTable } from '../../shared/schema';
import { uploadMedia } from './handler';
import type { MediaStore, ImageTranscoder } from './dto';

/** Objet-store en mémoire : le handler ne doit rien savoir de R2. */
function memoryStore() {
  const objects = new Map<string, ArrayBuffer>();
  const store: MediaStore = {
    async has(key) { return objects.has(key); },
    async put(key, bytes) { objects.set(key, bytes); }
  };
  return { store, objects };
}

/**
 * Faux transcodeur : rend un tampon dont la taille dépend de la largeur demandée, de
 * quoi vérifier que chaque déclinaison est bien distincte sans encoder quoi que ce soit.
 */
function fakeTranscoder(): ImageTranscoder & { calls: { width: number; format: string }[] } {
  const calls: { width: number; format: string }[] = [];
  return {
    calls,
    async resize(_bytes, { width, format }) {
      calls.push({ width, format });
      return { bytes: new Uint8Array(width).buffer, contentType: format };
    }
  };
}

const variantsOf = (db: Db, mediaId: number) =>
  db.select().from(cmsMediaVariantsTable).all().then((rows) => rows.filter((r) => r.mediaId === mediaId));

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

describe('uploadMedia — déclinaisons', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it("produit l'échelle en avif et en webp, et la dépose", async () => {
    const { store, objects } = memoryStore();
    const transcoder = fakeTranscoder();
    const media = await uploadMedia(
      db,
      store,
      { bytes: png(1), mimeType: 'image/png', width: 1600, height: 1200 },
      transcoder
    );

    const rows = await variantsOf(db, media.id);
    // 4 largeurs × 2 formats.
    expect(rows).toHaveLength(8);
    expect(rows.filter((r) => r.format === 'avif').map((r) => r.width).sort((a, b) => a - b))
      .toEqual([400, 800, 1200, 1600]);
    // La hauteur suit le ratio de l'original, sans interroger le transcodeur.
    expect(rows.find((r) => r.width === 800 && r.format === 'webp')?.height).toBe(600);
    // Original + 8 déclinaisons.
    expect(objects.size).toBe(9);
    expect(objects.has(`media/${media.contentHash}/800.avif`)).toBe(true);
  });

  it("n'agrandit jamais au-delà de la largeur d'origine", async () => {
    // Produire un 1600 depuis un 500 ajoute du poids sans ajouter de détail. Même
    // règle qu'à la reprise WordPress, pour que les deux échelles coïncident.
    const { store } = memoryStore();
    const media = await uploadMedia(
      db,
      store,
      { bytes: png(4), mimeType: 'image/png', width: 500, height: 250 },
      fakeTranscoder()
    );

    const widths = [...new Set((await variantsOf(db, media.id)).map((r) => r.width))];
    expect(widths).toEqual([400]);
  });

  it('laisse le GIF et le PDF tranquilles', async () => {
    // Transcoder un GIF en format fixe le figerait sur sa première image ; un PDF n'a
    // pas de largeur. Les deux restent acceptés au dépôt, servis tels quels.
    const { store } = memoryStore();
    const gif = await uploadMedia(
      db, store, { bytes: png(5), mimeType: 'image/gif', width: 800, height: 600 }, fakeTranscoder()
    );
    const pdf = await uploadMedia(
      db, store, { bytes: png(6), mimeType: 'application/pdf' }, fakeTranscoder()
    );

    expect(await variantsOf(db, gif.id)).toHaveLength(0);
    expect(await variantsOf(db, pdf.id)).toHaveLength(0);
  });

  it('ignore une variante rendue dans un autre format que celui demandé', async () => {
    // Cloudflare abandonne l'AVIF au profit du WebP quand l'image est grande ou le
    // service chargé, sans le signaler. Garder ces octets sous la clé `.avif` les
    // ferait annoncer en `<source type="image/avif">`, que le navigateur choisirait
    // avant d'échouer à les décoder — une image cassée, pas une image allégée.
    const { store, objects } = memoryStore();
    const fallback: ImageTranscoder = {
      async resize(_bytes, { width, format }) {
        const rendered = format === 'image/avif' && width >= 1200 ? 'image/webp' : format;
        return { bytes: new Uint8Array(width).buffer, contentType: rendered };
      }
    };

    const media = await uploadMedia(
      db, store, { bytes: png(12), mimeType: 'image/png', width: 1600, height: 1200 }, fallback
    );

    const rows = await variantsOf(db, media.id);
    // L'échelle WebP reste complète, l'AVIF s'arrête là où le service a renoncé.
    expect(rows.filter((r) => r.format === 'webp').map((r) => r.width)).toEqual([400, 800, 1200, 1600]);
    expect(rows.filter((r) => r.format === 'avif').map((r) => r.width)).toEqual([400, 800]);
    // Aucun objet n'a été déposé sous une clé qui mentirait sur son contenu.
    expect(objects.has(`media/${media.contentHash}/1200.avif`)).toBe(false);
  });

  it('dépose quand même si le transcodage échoue', async () => {
    // Une déclinaison est une optimisation, pas une condition : un quota Images épuisé
    // ne doit pas faire échouer l'envoi et pousser l'utilisateur à recommencer.
    const { store, objects } = memoryStore();
    const broken: ImageTranscoder = {
      async resize() { throw new Error('quota dépassé'); }
    };

    const media = await uploadMedia(
      db, store, { bytes: png(8), mimeType: 'image/png', width: 800, height: 600 }, broken
    );

    expect(media.id).toBeGreaterThan(0);
    expect(objects.has(media.key)).toBe(true);
    expect(await variantsOf(db, media.id)).toHaveLength(0);
  });

  it('rattrape une échelle manquante au redépôt du même fichier', async () => {
    // Les médias déposés avant la production d'échelles n'en ont aucune, et rien dans
    // l'administration ne permet de la réclamer : redéposer sert de réparation.
    const { store } = memoryStore();
    const first = await uploadMedia(db, store, {
      bytes: png(9), mimeType: 'image/png', width: 800, height: 600
    });
    expect(await variantsOf(db, first.id)).toHaveLength(0);

    const second = await uploadMedia(
      db, store, { bytes: png(9), mimeType: 'image/png', width: 800, height: 600 }, fakeTranscoder()
    );

    expect(second.id).toBe(first.id);
    expect(await variantsOf(db, first.id)).toHaveLength(4);
  });

  it("ne reproduit pas une échelle déjà là", async () => {
    const { store } = memoryStore();
    const transcoder = fakeTranscoder();
    const input = { bytes: png(11), mimeType: 'image/png' as const, width: 800, height: 600 };

    await uploadMedia(db, store, input, transcoder);
    const afterFirst = transcoder.calls.length;
    await uploadMedia(db, store, input, transcoder);

    expect(transcoder.calls.length).toBe(afterFirst);
  });
});
