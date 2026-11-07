// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readCookie, signCardSession, signPending, verifyCardSession, verifyPending } from './session';

describe('cookies de la carte', () => {
  it('relit une session signée, et refuse une autre clé', async () => {
    const token = await signCardSession({ cardId: 3, deviceId: 'appareil' }, 'secret');
    expect(await verifyCardSession(token, 'secret')).toEqual({ cardId: 3, deviceId: 'appareil' });
    expect(await verifyCardSession(token, 'autre')).toBeNull();
  });

  it('un cookie de code ne passe pas pour une session', async () => {
    const pending = await signPending('a@example.org', 'secret');
    expect(await verifyPending(pending, 'secret')).toBe('a@example.org');
    expect(await verifyCardSession(pending, 'secret')).toBeNull();
  });

  it('lit un cookie parmi d\'autres', () => {
    expect(readCookie('a=1; nba_carte=xyz; b=2', 'nba_carte')).toBe('xyz');
    expect(readCookie('a=1', 'nba_carte')).toBeNull();
  });
});
