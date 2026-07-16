import { describe, it, expect } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
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

  it('should validate missing headers and show local error alert', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PoonaImporter, {
      target,
      props: {}
    });
    flushSync();

    // Simuler le chargement d'un CSV avec des en-têtes invalides
    const file = new File(['Licence;Sexe\n1000001;M'], 'members_invalid.csv', { type: 'text/csv' });
    
    // Simuler l'analyse locale en appelant l'API FileReader (ou en simulant le changement de fichier réactif)
    const input = target.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();

    // Attendre la lecture asynchrone du FileReader
    await new Promise(resolve => setTimeout(resolve, 100));
    flushSync();

    // Vérifier que le message d'erreur locale s'affiche
    expect(target.textContent).toContain('En-têtes obligatoires manquants');
    // Le bouton de soumission doit être désactivé
    const submitBtn = target.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    unmount(component);
    document.body.removeChild(target);
  });

  it('should parse valid CSV file and display preview table with 5 rows', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PoonaImporter, {
      target,
      props: {}
    });
    flushSync();

    const csvContent = 'Licence;Saison;Nom;Prénom;Sexe;Date naissance;Type\n1000001;25-26;Dupont;Jean;M;01-01-1990;Competiteur';
    const file = new File([csvContent], 'members_valid.csv', { type: 'text/csv' });
    
    const input = target.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();

    await new Promise(resolve => setTimeout(resolve, 100));
    flushSync();

    // L'aperçu doit s'afficher
    expect(target.textContent).toContain('Aperçu des données');
    expect(target.textContent).toContain('1000001');
    expect(target.textContent).toContain('Dupont');
    expect(target.textContent).toContain('Jean');

    unmount(component);
    document.body.removeChild(target);
  });
});
