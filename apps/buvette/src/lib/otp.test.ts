// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkCode, generateCode, isLimited, storeCode } from './otp';

function memoryKv() {
  const data = new Map<string, string>();
  return {
    get: async (k: string) => data.get(k) ?? null,
    put: async (k: string, v: string) => void data.set(k, v),
    delete: async (k: string) => void data.delete(k)
  };
}

describe('code de vérification', () => {
  it('génère 6 chiffres', () => {
    expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('accepte le bon code une seule fois', async () => {
    const kv = memoryKv();
    await storeCode(kv, 'a@example.org', '123456');
    expect(await checkCode(kv, 'a@example.org', '123456')).toBe('ok');
    expect(await checkCode(kv, 'a@example.org', '123456')).toBe('expired');
  });

  it('se verrouille après 5 essais', async () => {
    const kv = memoryKv();
    await storeCode(kv, 'a@example.org', '123456');
    for (let i = 0; i < 4; i++) expect(await checkCode(kv, 'a@example.org', '000000')).toBe('invalid');
    expect(await checkCode(kv, 'a@example.org', '000000')).toBe('locked');
    expect(await checkCode(kv, 'a@example.org', '123456')).toBe('expired');
  });

  it('borne les envois', async () => {
    const kv = memoryKv();
    expect(await isLimited(kv, 'k', 2, 600)).toBe(false);
    expect(await isLimited(kv, 'k', 2, 600)).toBe(false);
    expect(await isLimited(kv, 'k', 2, 600)).toBe(true);
  });
});
