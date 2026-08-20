import { describe, it, expect } from 'vitest';
import { formatAppVersion } from './app-version';

describe('formatAppVersion', () => {
  it('préfixe la version nue de semantic-release', () => {
    expect(formatAppVersion('1.1.1')).toBe('v1.1.1');
  });

  it("ne double pas le préfixe d'un tag git", () => {
    // `git describe` rend « v1.1.1 » : c'est ce que promote.yml passe au build de
    // production, et ce qui s'affichait « vv1.1.1 » sur l'écran de démarrage.
    expect(formatAppVersion('v1.1.1')).toBe('v1.1.1');
    expect(formatAppVersion('V1.1.1')).toBe('v1.1.1');
  });

  it('garde la version de repli des builds hors release', () => {
    expect(formatAppVersion('0.0.0-a1b2c3d')).toBe('v0.0.0-a1b2c3d');
  });

  it('retombe sur 0.0.0 quand rien ne lui parvient', () => {
    expect(formatAppVersion(undefined)).toBe('v0.0.0');
    expect(formatAppVersion('')).toBe('v0.0.0');
  });
});
