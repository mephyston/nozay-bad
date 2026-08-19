import { describe, it, expect } from 'vitest';
import { base64UrlDecode, base64UrlEncode, utf8 } from './base64';
import { encryptPayload, MAX_PAYLOAD_BYTES } from './encrypt';
import { buildVapidAuthorization, generateVapidKeys } from './vapid';

/**
 * Vecteur de l'annexe A de la RFC 8291. Il fige l'intégralité de la chaîne :
 * dérivation ECDH, HKDF, AES-128-GCM et cadrage de l'en-tête `aes128gcm`.
 */
const RFC8291 = {
  plaintext: 'When I grow up, I want to be a watermelon',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  authSecret: 'BTBZMqHH6r4Tts7J_aSIgg',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  expectedBody:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'
};

/** Reconstruit une paire ECDH P-256 à partir des clés brutes du vecteur de test. */
async function importEcdhKeyPair(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKeyPair> {
  const publicBytes = base64UrlDecode(publicKeyB64);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicBytes.slice(1, 33)),
    y: base64UrlEncode(publicBytes.slice(33, 65)),
    ext: true
  };
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { ...jwk, d: privateKeyB64 },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  return { publicKey, privateKey };
}

describe('encryptPayload (RFC 8291)', () => {
  it("reproduit le corps chiffré de l'annexe A", async () => {
    const serverKeys = await importEcdhKeyPair(RFC8291.asPublic, RFC8291.asPrivate);

    const body = await encryptPayload(
      { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret },
      RFC8291.plaintext,
      { salt: base64UrlDecode(RFC8291.salt), serverKeys }
    );

    expect(base64UrlEncode(body)).toBe(RFC8291.expectedBody);
  });

  it("produit un en-tête aes128gcm bien formé et un sel aléatoire à chaque envoi", async () => {
    const keys = { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret };
    const first = await encryptPayload(keys, 'coucou');
    const second = await encryptPayload(keys, 'coucou');

    // salt(16) + rs(4) + idlen(1) + clé publique(65)
    expect(new DataView(first.buffer, first.byteOffset).getUint32(16, false)).toBe(4096);
    expect(first[20]).toBe(65);
    expect(first.length).toBeGreaterThan(86);

    // Le sel et la clé éphémère ne doivent jamais être réutilisés d'un envoi à l'autre.
    expect(base64UrlEncode(first.slice(0, 86))).not.toBe(base64UrlEncode(second.slice(0, 86)));
  });

  it('refuse une charge utile au-delà de la limite des services de push', async () => {
    await expect(
      encryptPayload(
        { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret },
        'a'.repeat(MAX_PAYLOAD_BYTES + 1)
      )
    ).rejects.toThrow(/maximum/);
  });

  it('rejette une clé p256dh invalide', async () => {
    await expect(
      encryptPayload({ p256dh: base64UrlEncode(utf8('trop court')), auth: RFC8291.authSecret }, 'x')
    ).rejects.toThrow(/p256dh/);
  });
});

describe('buildVapidAuthorization (RFC 8292)', () => {
  it("signe un JWT ES256 vérifiable, borné à l'origine de l'endpoint", async () => {
    const vapid = { subject: 'mailto:contact@nozaybad.fr', ...(await generateVapidKeys()) };

    const header = await buildVapidAuthorization('https://web.push.apple.com/abcdef?x=1', vapid);

    const match = /^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, jwt, publicKey] = match!;
    expect(publicKey).toBe(vapid.publicKey);

    const [protectedHeader, claims, signature] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(protectedHeader)))).toEqual({
      typ: 'JWT',
      alg: 'ES256'
    });

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(claims)));
    // L'audience est l'origine seule : ni le chemin ni la query de l'endpoint.
    expect(payload.aud).toBe('https://web.push.apple.com');
    expect(payload.sub).toBe('mailto:contact@nozaybad.fr');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

    const publicBytes = base64UrlDecode(vapid.publicKey);
    const verifyKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        x: base64UrlEncode(publicBytes.slice(1, 33)),
        y: base64UrlEncode(publicBytes.slice(33, 65)),
        ext: true
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifyKey,
      base64UrlDecode(signature),
      utf8(`${protectedHeader}.${claims}`)
    );
    expect(valid).toBe(true);
  });

  it('échoue si la configuration VAPID est incomplète', async () => {
    await expect(
      buildVapidAuthorization('https://fcm.googleapis.com/fcm/send/x', {
        subject: '',
        publicKey: 'x',
        privateKey: 'y'
      })
    ).rejects.toThrow(/VAPID/);
  });
});
