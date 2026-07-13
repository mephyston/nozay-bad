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
          { licence: '1111111', lastName: 'Martin', firstName: 'Jean', gender: 'M', birthDate: '1980-01-01', status: 'valide', type: 'Competiteur' }
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
});
