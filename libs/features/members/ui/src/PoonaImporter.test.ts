import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import PoonaImporter from './PoonaImporter.svelte';

describe('PoonaImporter Component', () => {
  it('renders the drag and drop zone by default', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(PoonaImporter, {
      target,
      props: {
        result: null,
        error: null
      }
    });

    expect(target.innerHTML).toContain('Sélectionnez un fichier CSV');
    expect(target.innerHTML).toContain('Glissez et déposez');
  });

  it('renders error messages when provided', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(PoonaImporter, {
      target,
      props: {
        result: null,
        error: 'Le fichier CSV est corrompu.'
      }
    });

    expect(target.innerHTML).toContain('Le fichier CSV est corrompu.');
  });

  it('renders stats when result is provided', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(PoonaImporter, {
      target,
      props: {
        result: {
          success: true,
          inserted: 12,
          updated: 5,
          errors: 2
        },
        error: null
      }
    });

    expect(target.innerHTML).toContain('Importation réussie');
    expect(target.innerHTML).toContain('12'); // inserted count
    expect(target.innerHTML).toContain('5'); // updated count
    expect(target.innerHTML).toContain('2'); // errors count
  });
});
