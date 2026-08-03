// @vitest-environment node
// jose (WebCrypto) a un problème inter-realm de `instanceof Uint8Array` sous jsdom ;
// ces primitives crypto se testent en environnement node (comportement prod identique).
import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  storeOtp,
  verifyOtp,
  generateOtpCode,
  maskEmail,
  OTP_MAX_ATTEMPTS,
  type SessionMember
} from './auth';

const SECRET = 'test-secret-key-abcdefghijklmnop';
const members: SessionMember[] = [
  { id: 1, firstName: 'Léa', lastName: 'Martin', licence: '1000001', paid: true },
  { id: 2, firstName: 'Tom', lastName: 'Martin', licence: '1000002', paid: false }
];

describe('session', () => {
  it('signe et vérifie une session (round-trip)', async () => {
    const token = await signSession({ email: 'parent@ex.fr', members, activeMemberId: 1 }, SECRET);
    const session = await verifySession(token, SECRET);
    expect(session).not.toBeNull();
    expect(session!.email).toBe('parent@ex.fr');
    expect(session!.members).toHaveLength(2);
    expect(session!.activeMemberId).toBe(1);
  });

  it('rejette un token signé avec un autre secret', async () => {
    const token = await signSession({ email: 'parent@ex.fr', members, activeMemberId: 1 }, SECRET);
    expect(await verifySession(token, 'un-autre-secret-xxxxxxxxxxxxxxxx')).toBeNull();
  });

  it('rejette un token malformé', async () => {
    expect(await verifySession('pas-un-jwt', SECRET)).toBeNull();
  });
});

describe('otp', () => {
  it('génère un code à 6 chiffres', () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('valide le bon code une seule fois puis le consomme', async () => {
    const email = 'otp-ok@ex.fr';
    await storeOtp(undefined, email, '123456', members);
    const ok = await verifyOtp(undefined, email, '123456');
    expect(ok.ok).toBe(true);
    expect(ok.members).toHaveLength(2);
    // Consommé : une 2ᵉ vérification échoue.
    const again = await verifyOtp(undefined, email, '123456');
    expect(again.ok).toBe(false);
    expect(again.error).toBe('expired');
  });

  it('refuse un mauvais code puis verrouille après le max de tentatives', async () => {
    const email = 'otp-lock@ex.fr';
    await storeOtp(undefined, email, '000000', members);
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) {
      const r = await verifyOtp(undefined, email, '111111');
      expect(r.ok).toBe(false);
      expect(r.error).toBe('invalid');
    }
    // Tentative finale → verrouillage
    const locked = await verifyOtp(undefined, email, '111111');
    expect(locked.ok).toBe(false);
    expect(locked.error).toBe('locked');
    // Même le bon code ne passe plus (enregistrement supprimé).
    const afterLock = await verifyOtp(undefined, email, '000000');
    expect(afterLock.ok).toBe(false);
  });

  it('retourne expired pour un email sans code', async () => {
    const r = await verifyOtp(undefined, 'jamais@ex.fr', '123456');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('expired');
  });
});

describe('maskEmail', () => {
  it('masque le local et le domaine en gardant le TLD', () => {
    expect(maskEmail('parent@example.fr')).toBe('p***@***.fr');
  });
});
