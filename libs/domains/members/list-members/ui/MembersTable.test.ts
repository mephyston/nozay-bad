import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import MembersTable from './MembersTable.svelte';

describe('MembersTable Component', () => {
  it('renders filter selections and member lines', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(MembersTable, {
      target,
      props: {
        data: [
          { id: 1, licence: '1111111', lastName: 'Martin', firstName: 'Jean', gender: 'M', birthDate: '1980-01-01', status: 'valide', type: 'Competiteur', paid: true }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        filters: {
          search: '',
          gender: '',
          status: '',
          type: '',
          season: '25-26'
        },
        seasons: []
      }
    });

    expect(target.innerHTML).toContain('Martin');
    expect(target.innerHTML).toContain('Jean');
    expect(target.innerHTML).toContain('1111111');
  });

  const monter = (props: Record<string, unknown>) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(MembersTable, {
      target,
      props: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        filters: { search: 'mar', gender: '', status: 'en_attente', type: '', season: '25-26' },
        seasons: [],
        ...props
      }
    });
    return target;
  };

  it("propose l'export des mails aux filtres appliqués", () => {
    const target = monter({ canExport: true });
    const lien = target.querySelector('a[download]') as HTMLAnchorElement | null;
    expect(lien?.textContent).toContain('Exporter les mails');
    expect(lien?.getAttribute('href')).toBe('/admin/api/members/export?search=mar&status=en_attente&season=25-26');
  });

  it("ne propose pas l'export sans le droit", () => {
    const target = monter({ canExport: false });
    expect(target.innerHTML).not.toContain('Exporter les mails');
  });
});
