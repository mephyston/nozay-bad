import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { getMemberPhoto } from './handler';
import { uploadMemberPhoto } from '../upload-member-photo/handler';
import type { PhotoStore } from '../upload-member-photo/dto';

const noopStore: PhotoStore = {
  async put() {},
  async deletePrefix() {}
};

const image = () => new Uint8Array(64).fill(1).buffer;

describe('getMemberPhoto', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await uploadMemberPhoto(db, noopStore, {
      licence: '06123456',
      bytes: image(),
      mimeType: 'image/jpeg'
    });
  });

  it('rend la seule grande taille quand c’est elle qu’on demande', async () => {
    const { keys } = await getMemberPhoto(db, { licence: '06123456', size: 512 });
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/\/512$/);
  });

  it('ajoute la grande taille en repli derrière la vignette', async () => {
    const { keys } = await getMemberPhoto(db, { licence: '06123456', size: 128 });
    // L'ordre fait la règle : la vignette d'abord, la grande si elle manque.
    expect(keys[0]).toMatch(/\/128$/);
    expect(keys[1]).toMatch(/\/512$/);
  });

  it('lève 404 pour une licence sans portrait', async () => {
    await expect(getMemberPhoto(db, { licence: '06999999', size: 512 })).rejects.toMatchObject({
      status: 404
    });
  });
});
