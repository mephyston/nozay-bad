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

  it('rejette un fichier non-JPEG (ex: PNG)', async () => {
    await expect(uploadAttestationSignature(db, { signature: pngBase64 })).rejects.toBeInstanceOf(InvalidSignatureError);
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
