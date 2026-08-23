// @vitest-environment node
// jose (WebCrypto) a un problème inter-realm de `instanceof Uint8Array` sous jsdom ;
// ces primitives crypto se testent en environnement node (comportement prod identique).
import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  SESSION_TTL_SECONDS,
  SESSION_REFRESH_AFTER_SECONDS,
  storeOtp,
  verifyOtp,
  generateOtpCode,
  maskEmail,
  OTP_MAX_ATTEMPTS,
  type SessionMember
} from './auth';

const SECRET = 'test-secret-key-abcdefghijklmnop';
const members: SessionMember[] = [
  { id: 1, firstName: 'Léa', lastName: 'Martin', licence: '1000001', paid: true, expenseAuthorized: false },
  { id: 2, firstName: 'Tom', lastName: 'Martin', licence: '1000002', paid: false, expenseAuthorized: true }
];

describe('session', () => {
  it('signe et vérifie une session (round-trip)', async () => {
    const token = await signSession({ email: 'parent@ex.fr', members, activeMemberId: 1, seasonCode: '25-26' }, SECRET);
    const session = await verifySession(token, SECRET);
    expect(session).not.toBeNull();
    expect(session!.email).toBe('parent@ex.fr');
    expect(session!.members).toHaveLength(2);
    expect(session!.activeMemberId).toBe(1);
    expect(session!.seasonCode).toBe('25-26');
  });

  it('traite une session sans saison (émise avant le champ) comme périmée', async () => {
    // Le champ manquant vaut chaîne vide : `isSeasonOpen` ne reconnaîtra aucune saison,
    // donc le middleware revérifiera la licence puis régénérera la session.
    const token = await signSession({ email: 'parent@ex.fr', members, activeMemberId: 1, seasonCode: undefined as any }, SECRET);
    const session = await verifySession(token, SECRET);
    expect(session).not.toBeNull();
    expect(session!.seasonCode).toBe('');
  });

  it('rejette un token signé avec un autre secret', async () => {
    const token = await signSession({ email: 'parent@ex.fr', members, activeMemberId: 1, seasonCode: '25-26' }, SECRET);
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
    await storeOtp(undefined, email, '123456', members, '25-26');
    const ok = await verifyOtp(undefined, email, '123456');
    expect(ok.ok).toBe(true);
    expect(ok.members).toHaveLength(2);
    // La saison vérifiée à la demande du code voyage jusqu'à la session.
    expect(ok.seasonCode).toBe('25-26');
    // Consommé : une 2ᵉ vérification échoue.
    const again = await verifyOtp(undefined, email, '123456');
    expect(again.ok).toBe(false);
    expect(again.error).toBe('expired');
  });

  it('refuse un mauvais code puis verrouille après le max de tentatives', async () => {
    const email = 'otp-lock@ex.fr';
    await storeOtp(undefined, email, '000000', members, '25-26');
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

/**
 * Session glissante.
 *
 * Le vrai enjeu n'est pas la durée mais la SYNCHRONISATION : une session fixe déconnecte
 * le même jour tous ceux qui se sont connectés le même jour, et fait redemander un code
 * à tout le club en même temps — ce qu'un plafond d'envoi quotidien ne laisse pas passer.
 */
describe('prolongation de session', () => {
  const members = [
    { id: 1, firstName: 'Camille', lastName: 'Durand', licence: '00000001', paid: true, expenseAuthorized: false }
  ];
  const payload = { email: 'parent@ex.fr', members, activeMemberId: 1, seasonCode: '25-26' };

  it('rend l’expiration du jeton, pour que le middleware puisse décider', async () => {
    const token = await signSession(payload, SECRET);
    const session = await verifySession(token, SECRET);

    const now = Math.floor(Date.now() / 1000);
    expect(session!.expiresAt).toBeGreaterThan(now + SESSION_TTL_SECONDS - 60);
    expect(session!.expiresAt).toBeLessThanOrEqual(now + SESSION_TTL_SECONDS);
  });

  it('resigne une session sans emporter son ancienne expiration', async () => {
    const token = await signSession(payload, SECRET);
    const read = await verifySession(token, SECRET);

    // Le middleware repasse la session lue à `signSession` : si `expiresAt` était
    // recopié tel quel, prolonger ne prolongerait rien.
    const renewed = await signSession(read!, SECRET);
    const again = await verifySession(renewed, SECRET);

    expect(again!.expiresAt).toBeGreaterThanOrEqual(read!.expiresAt!);
    expect(again).toMatchObject({ email: 'parent@ex.fr', activeMemberId: 1, seasonCode: '25-26' });
  });

  it('laisse dix jours avant de prolonger, et vingt jours de marge ensuite', () => {
    // Prolonger à chaque requête coûterait une signature et un `Set-Cookie` par réponse.
    expect(SESSION_REFRESH_AFTER_SECONDS).toBeLessThan(SESSION_TTL_SECONDS);
    // La marge restante après le seuil est ce qui absorbe une absence : vingt jours.
    expect(SESSION_TTL_SECONDS - SESSION_REFRESH_AFTER_SECONDS).toBe(60 * 60 * 24 * 20);
  });
});
