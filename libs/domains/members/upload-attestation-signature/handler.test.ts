import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadAttestationSignature } from './handler';
import { InvalidSignatureError, SignatureTooLargeError } from '../shared/errors';
import { MAX_SIGNATURE_BYTES } from '../shared/attestation/config';

const updateSignature = vi.fn().mockResolvedValue(undefined);

vi.mock('../shared/attestation/repository', () => ({
  AttestationConfigRepository: vi.fn().mockImplementation(function () {
    return { updateSignature };
  })
}));

// base64 d'un en-tête JPEG (FF D8 FF …) → commence par "/9j/". Le handler ne
// valide que la signature magique + la taille, pas la structure JPEG complète.
const jpegBase64 = '/9j/4AAQSkZJRgABAQ==';
// base64 d'une signature PNG (89 50 4E 47 …).
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUg==';

describe('uploadAttestationSignature handler', () => {
  const db = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepte un JPEG valide et stocke le base64 nettoyé (préfixe data URL retiré)', async () => {
    await uploadAttestationSignature(db, { signature: `data:image/jpeg;base64,${jpegBase64}` });
    expect(updateSignature).toHaveBeenCalledWith(db, jpegBase64);
  });

  it('nettoie les espaces/retours ligne du base64', async () => {
    await uploadAttestationSignature(db, { signature: `${jpegBase64.slice(0, 4)}\n ${jpegBase64.slice(4)}` });
    expect(updateSignature).toHaveBeenCalledWith(db, jpegBase64);
  });

  it('accepte désormais un PNG, refusé jusque-là sans raison', async () => {
    // `libs/shared/pdf` savait déjà intégrer les deux formats ; seul ce chemin-ci les
    // distinguait. Le PNG est même préférable pour une signature — il garde la
    // transparence.
    await uploadAttestationSignature(db, { signature: pngBase64 });
    expect(updateSignature).toHaveBeenCalledWith(db, pngBase64);
  });

  it('rejette un format qui n’est ni PNG ni JPEG (ex: GIF)', async () => {
    await expect(
      uploadAttestationSignature(db, { signature: 'R0lGODlhAQABAAAAACw=' })
    ).rejects.toBeInstanceOf(InvalidSignatureError);
    expect(updateSignature).not.toHaveBeenCalled();
  });

  it('rejette une signature vide', async () => {
    await expect(uploadAttestationSignature(db, { signature: '   ' })).rejects.toBeInstanceOf(InvalidSignatureError);
  });

  it('rejette une signature au-delà du plafond de taille', async () => {
    const bigBase64 = '/9j/' + 'A'.repeat(70000); // ~52 Ko décodés > MAX_SIGNATURE_BYTES
    expect(Math.floor((bigBase64.length * 3) / 4)).toBeGreaterThan(MAX_SIGNATURE_BYTES);
    await expect(uploadAttestationSignature(db, { signature: bigBase64 })).rejects.toBeInstanceOf(SignatureTooLargeError);
    expect(updateSignature).not.toHaveBeenCalled();
  });
});

/**
 * PNG accepté au même titre que le JPEG.
 *
 * Il était refusé sans autre raison que l'ordre dans lequel les choses ont été écrites —
 * `libs/shared/pdf` savait déjà intégrer les deux. C'est même le format qu'on préfère
 * pour une signature : il garde la transparence, là où le JPEG pose un rectangle blanc
 * sur le document et bave autour des traits fins.
 */
describe('signature au format PNG', () => {
  /** Un PNG minimal : ses octets commencent par 89 50 4E 47, soit « iVBORw0KGgo ». */
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  beforeEach(() => updateSignature.mockClear());

  it('accepte un PNG préfixé par sa data URL', async () => {
    await uploadAttestationSignature({} as never, { signature: `data:image/png;base64,${pngBase64}` });
    expect(updateSignature).toHaveBeenCalledWith(expect.anything(), pngBase64);
  });

  it('accepte un PNG brut', async () => {
    await uploadAttestationSignature({} as never, { signature: pngBase64 });
    expect(updateSignature).toHaveBeenCalledWith(expect.anything(), pngBase64);
  });

  it('refuse ce qui n’est ni PNG ni JPEG, quel que soit le préfixe annoncé', async () => {
    // Le format est lu dans les octets — ici un GIF — et non dans le type que le
    // navigateur déclare, qui vient du client et ne prouve rien.
    await expect(
      uploadAttestationSignature({} as never, {
        signature: 'data:image/png;base64,R0lGODlhAQABAAAAACw='
      })
    ).rejects.toThrow(InvalidSignatureError);
    expect(updateSignature).not.toHaveBeenCalled();
  });
});
