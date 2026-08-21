import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { personsTable } from '../shared/schema';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { uploadMemberPhoto } from './handler';
import { deleteMemberPhoto } from '../delete-member-photo/handler';
import type { PhotoStore, PhotoTranscoder } from './dto';

/** Objet-store en mémoire : le handler ne doit rien savoir de R2. */
function memoryStore() {
  const objects = new Map<string, { bytes: ArrayBuffer; mimeType: string }>();
  const store: PhotoStore = {
    async put(key, bytes, mimeType) {
      objects.set(key, { bytes, mimeType });
    },
    async deletePrefix(prefix) {
      for (const key of [...objects.keys()]) {
        if (key.startsWith(`${prefix}/`)) objects.delete(key);
      }
    }
  };
  return { store, objects };
}

/** Rend un tampon dont la taille suit la largeur demandée : les tailles restent distinctes. */
function fakeTranscoder(): PhotoTranscoder & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    async resize(_bytes, { width, format }) {
      calls.push(width);
      return { bytes: new Uint8Array(width).buffer, contentType: format };
    }
  };
}

const image = (fill: number, size = 64) => new Uint8Array(size).fill(fill).buffer;
const profileOf = (db: Db, licence: string) =>
  db.select().from(personsTable).all().then((rows) => rows.find((r) => r.licence === licence));

describe('uploadMemberPhoto', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    // Le portrait est une colonne de la personne : il faut donc qu'elle existe.
    await insertMemberFixture(db, { licence: '06123456', seasonId: 1 });
    await insertMemberFixture(db, { licence: '06999999', seasonId: 1 });
  });

  it('dépose les deux tailles et enregistre le préfixe sur la licence', async () => {
    const { store, objects } = memoryStore();
    const transcoder = fakeTranscoder();

    const result = await uploadMemberPhoto(
      db,
      store,
      { licence: '06123456', bytes: image(1), mimeType: 'image/jpeg' },
      transcoder,
      new Date('2026-08-21T10:00:00Z')
    );

    expect(transcoder.calls).toEqual([512, 128]);
    const keys = [...objects.keys()];
    expect(keys).toHaveLength(2);
    expect(keys.every((key) => key.startsWith('member-photos/'))).toBe(true);

    const profile = await profileOf(db, '06123456');
    expect(profile?.photoKey).toMatch(/^member-photos\/[a-f0-9]{16}$/);
    expect(result.photoUpdatedAt).toBe(new Date('2026-08-21T10:00:00Z').getTime());
  });

  it("dépose l'original tel quel quand le binding Images est absent", async () => {
    const { store, objects } = memoryStore();

    await uploadMemberPhoto(db, store, {
      licence: '06123456',
      bytes: image(2),
      mimeType: 'image/png'
    });

    // Une seule taille, et le type d'origine : la vignette manque, la route de service
    // retombera sur la grande.
    expect([...objects.keys()]).toHaveLength(1);
    expect([...objects.values()][0].mimeType).toBe('image/png');
  });

  it('produit quand même la grande taille si le transcodage échoue', async () => {
    const { store, objects } = memoryStore();
    const failing: PhotoTranscoder = {
      async resize() {
        throw new Error('quota Images épuisé');
      }
    };

    await uploadMemberPhoto(db, store, {
      licence: '06123456',
      bytes: image(3),
      mimeType: 'image/webp'
    }, failing);

    expect([...objects.keys()]).toHaveLength(1);
    expect(await profileOf(db, '06123456')).toBeDefined();
  });

  /**
   * Constaté en développement : une image minuscule agrandie revient avec un type MIME
   * correct et un corps vide. Sans garde, l'objet vide partait dans R2 et la fiche
   * affichait une image cassée.
   */
  it('retombe sur l’original quand le transcodage rend zéro octet', async () => {
    const { store, objects } = memoryStore();
    const empty: PhotoTranscoder = {
      async resize() {
        return { bytes: new ArrayBuffer(0), contentType: 'image/webp' };
      }
    };

    await uploadMemberPhoto(db, store, {
      licence: '06123456',
      bytes: image(4),
      mimeType: 'image/png'
    }, empty);

    const stored = [...objects.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0].bytes.byteLength).toBeGreaterThan(0);
    expect(stored[0].mimeType).toBe('image/png');
  });

  /**
   * D1 stocke les dates en secondes : rendre une milliseconde ici la ferait diverger de
   * ce que la fiche relit, et la même image serait chargée sous deux adresses.
   */
  it('rend un horodatage arrondi à la seconde, comme la relecture', async () => {
    const { store } = memoryStore();

    const result = await uploadMemberPhoto(
      db,
      store,
      { licence: '06123456', bytes: image(1), mimeType: 'image/jpeg' },
      undefined,
      new Date('2026-08-21T10:00:00.256Z')
    );

    expect(result.photoUpdatedAt).toBe(new Date('2026-08-21T10:00:00.000Z').getTime());
    expect((await profileOf(db, '06123456'))?.photoUpdatedAt?.getTime()).toBe(result.photoUpdatedAt);
  });

  it('remplace le portrait précédent et efface ses objets', async () => {
    const { store, objects } = memoryStore();

    await uploadMemberPhoto(db, store, { licence: '06123456', bytes: image(1), mimeType: 'image/jpeg' });
    const firstKey = [...objects.keys()][0];

    await uploadMemberPhoto(db, store, { licence: '06123456', bytes: image(9), mimeType: 'image/jpeg' });

    expect(objects.has(firstKey)).toBe(false);
    expect([...objects.keys()]).toHaveLength(1);
    // Une seule ligne par licence, et un seul portrait dessus : la personne n'est pas
    // dupliquée par un second dépôt.
    const rows = await db.select().from(personsTable).all();
    expect(rows.filter((r) => r.licence === '06123456')).toHaveLength(1);
  });

  it('conserve le portrait de la licence quand un autre adhérent dépose le sien', async () => {
    const { store, objects } = memoryStore();

    await uploadMemberPhoto(db, store, { licence: '06123456', bytes: image(1), mimeType: 'image/jpeg' });
    await uploadMemberPhoto(db, store, { licence: '06999999', bytes: image(2), mimeType: 'image/jpeg' });

    expect([...objects.keys()]).toHaveLength(2);
    expect((await profileOf(db, '06123456'))?.photoKey).not.toBe(
      (await profileOf(db, '06999999'))?.photoKey
    );
  });

  it('refuse un type non accepté', async () => {
    const { store } = memoryStore();
    await expect(
      uploadMemberPhoto(db, store, { licence: '06123456', bytes: image(1), mimeType: 'image/svg+xml' })
    ).rejects.toMatchObject({ status: 415 });
  });

  it('refuse un fichier vide', async () => {
    const { store } = memoryStore();
    await expect(
      uploadMemberPhoto(db, store, { licence: '06123456', bytes: new ArrayBuffer(0), mimeType: 'image/jpeg' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse au-delà de 2 Mo', async () => {
    const { store } = memoryStore();
    await expect(
      uploadMemberPhoto(db, store, {
        licence: '06123456',
        bytes: new ArrayBuffer(2 * 1024 * 1024 + 1),
        mimeType: 'image/jpeg'
      })
    ).rejects.toMatchObject({ status: 413 });
  });
});

describe('deleteMemberPhoto', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    // Le portrait est une colonne de la personne : il faut donc qu'elle existe.
    await insertMemberFixture(db, { licence: '06123456', seasonId: 1 });
    await insertMemberFixture(db, { licence: '06999999', seasonId: 1 });
  });

  it('efface les objets et vide la clé, sans supprimer le profil', async () => {
    const { store, objects } = memoryStore();
    await uploadMemberPhoto(db, store, { licence: '06123456', bytes: image(1), mimeType: 'image/jpeg' });

    expect(await deleteMemberPhoto(db, store, { licence: '06123456' })).toEqual({ deleted: true });
    expect([...objects.keys()]).toHaveLength(0);

    const profile = await profileOf(db, '06123456');
    expect(profile).toBeDefined();
    expect(profile?.photoKey).toBeNull();
    expect(profile?.photoUpdatedAt).toBeNull();
  });

  it("n'est pas une erreur quand il n'y a rien à effacer", async () => {
    const { store } = memoryStore();
    expect(await deleteMemberPhoto(db, store, { licence: '06123456' })).toEqual({ deleted: false });
  });
});
