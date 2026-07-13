import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import MemberProfile from './MemberProfile.svelte';

describe('MemberProfile Component', () => {
  it('renders profile card containing personal, contact and metadata fields', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(MemberProfile, {
      target,
      props: {
        member: {
          licence: '1234567',
          lastName: 'Dupont',
          firstName: 'Jean',
          gender: 'M',
          birthDate: '1990-01-01',
          email: 'jean.dupont@example.com',
          phone: '0612345678',
          status: 'valide',
          type: 'Competiteur',
          importedAt: '2026-07-07T12:00:00Z'
        }
      }
    });

    expect(target.innerHTML).toContain('Dupont Jean');
    expect(target.innerHTML).toContain('1234567');
    expect(target.innerHTML).toContain('jean.dupont@example.com');
    expect(target.innerHTML).toContain('0612345678');
  });
});
