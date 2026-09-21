import { describe, it, expect } from 'vitest';
import { memberPhotoUrl } from './member-photo';

describe('memberPhotoUrl', () => {
  it('rend null quand l’adhérent n’a pas de portrait', () => {
    expect(memberPhotoUrl('07512345', null)).toBeNull();
    expect(memberPhotoUrl('07512345', undefined)).toBeNull();
  });

  it('accepte les deux formes de version, et rend la même adresse', () => {
    const iso = memberPhotoUrl('07512345', '2026-09-01T10:00:00.000Z');
    const ms = memberPhotoUrl('07512345', Date.parse('2026-09-01T10:00:00.000Z'));
    expect(iso).toBe(ms);
    expect(iso).toContain('licence=07512345');
    expect(iso).toContain('size=128');
  });

  it('écarte une version illisible plutôt que de rendre une adresse cassée', () => {
    expect(memberPhotoUrl('07512345', 'pas une date')).toBeNull();
  });
});
