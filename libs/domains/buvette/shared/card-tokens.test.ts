import { describe, expect, it } from 'vitest';
import { signCardToken, verifyCardToken } from './card-tokens';

const SECRET = 'secret-de-test';
const NOW = Date.UTC(2026, 10, 7, 12);

describe('jetons de carte', () => {
  it('un QR code est valable 60 secondes', async () => {
    const { token } = await signCardToken(SECRET, 'qr', 7, 'appareil', NOW);
    expect((await verifyCardToken(SECRET, 'qr', token, NOW + 59_000))?.c).toBe(7);
    expect(await verifyCardToken(SECRET, 'qr', token, NOW + 60_000)).toBeNull();
  });

  it('un jeton de scan ne passe pas pour un QR code, ni l\'inverse', async () => {
    const qr = await signCardToken(SECRET, 'qr', 7, 'appareil', NOW);
    const scan = await signCardToken(SECRET, 'scan', 7, 'appareil', NOW);
    expect(await verifyCardToken(SECRET, 'scan', qr.token, NOW)).toBeNull();
    expect(await verifyCardToken(SECRET, 'qr', scan.token, NOW)).toBeNull();
  });

  it('une signature ou un contenu altérés sont refusés', async () => {
    const { token } = await signCardToken(SECRET, 'qr', 7, 'appareil', NOW);
    const [body, signature] = token.split('.');
    expect(await verifyCardToken('autre-secret', 'qr', token, NOW)).toBeNull();
    expect(await verifyCardToken(SECRET, 'qr', `${body}x.${signature}`, NOW)).toBeNull();
    expect(await verifyCardToken(SECRET, 'qr', 'n-importe-quoi', NOW)).toBeNull();
  });
});
