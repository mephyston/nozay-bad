import { describe, it, expect, vi, afterEach } from 'vitest';
import { shrinkPhoto, MAX_EDGE } from './shrink-photo';

describe('shrinkPhoto', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rend le fichier tel quel quand le navigateur ne sait pas décoder', async () => {
    // jsdom n'a ni `createImageBitmap` ni canevas : la lecture doit quand même partir.
    vi.stubGlobal('createImageBitmap', undefined);
    const file = new File([new Uint8Array([1, 2, 3])], 'cheque.heic', { type: 'image/heic' });
    expect(await shrinkPhoto(file)).toBe(file);
  });

  it('rend le fichier tel quel si le décodage échoue', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('format inconnu')));
    const file = new File([new Uint8Array([1, 2, 3])], 'cheque.jpg', { type: 'image/jpeg' });
    expect(await shrinkPhoto(file)).toBe(file);
  });

  it('ramène le plus grand côté à la taille maximale, en JPEG, orientation appliquée', async () => {
    const drawImage = vi.fn();
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    const createImageBitmap = vi.fn().mockResolvedValue(bitmap);
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob([new Uint8Array([9])], { type }))
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);

    const file = new File([new Uint8Array([1, 2, 3])], 'IMG_0001.HEIC', { type: 'image/heic' });
    const out = await shrinkPhoto(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
    expect(canvas.width).toBe(MAX_EDGE);
    expect(canvas.height).toBe(1200);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, MAX_EDGE, 1200);
    expect(out.type).toBe('image/jpeg');
    expect(out.name).toBe('IMG_0001.jpg');
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("n'agrandit jamais une photo déjà petite", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob([new Uint8Array([9])], { type }))
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
    await shrinkPhoto(new File([new Uint8Array([1])], 'p.jpg', { type: 'image/jpeg' }));
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});
