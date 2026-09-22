import { describe, it, expect, vi } from 'vitest';
import {
  detailDeMedia,
  estImage,
  gestesDeMedia,
  mediasFiltres,
  nomDeMedia,
  type MediaLike
} from './media-row-model';

function media(s: Partial<MediaLike> = {}): MediaLike {
  return {
    id: 1,
    key: 'media/2026/tournoi.webp',
    alt: 'Finale du tournoi',
    mimeType: 'image/webp',
    sizeBytes: 187 * 1024,
    width: 1600,
    height: 1200,
    ...s
  };
}

const gestes = () => ({ onOpen: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });
const TOUS = { canWrite: true, canDelete: true };

describe('media-row-model', () => {
  it('reconnaît une image d’un document', () => {
    expect(estImage(media())).toBe(true);
    expect(estImage(media({ mimeType: 'application/pdf' }))).toBe(false);
  });

  it('nomme un média par sa description, et par son fichier à défaut', () => {
    expect(nomDeMedia(media())).toBe('Finale du tournoi');
    // Sans description, le nom du fichier vaut mieux que « (sans description) » :
    // c'est ce qui permet de reconnaître un document dont on n'a pas de vignette.
    expect(nomDeMedia(media({ alt: '' }))).toBe('tournoi.webp');
    expect(nomDeMedia(media({ alt: '   ' }))).toBe('tournoi.webp');
  });

  it('dit le poids, et les dimensions quand il y en a', () => {
    expect(detailDeMedia(media())).toBe('187 Ko · 1600×1200');
    expect(detailDeMedia(media({ width: null, height: null }))).toBe('187 Ko');
  });

  describe('gestes', () => {
    it('met le geste le plus fréquent en tête', () => {
      const actions = gestesDeMedia(media(), TOUS, gestes());
      expect(actions[0].id).toBe('ouvrir');
      expect(actions[0].tone).toBe('primary');
    });

    it('ne double pas la question que l’écran pose déjà', () => {
      // La sienne prévient que les pages affichant ce média doivent être corrigées.
      const actions = gestesDeMedia(media(), TOUS, gestes());
      expect(actions.every((a) => a.confirm === undefined)).toBe(true);
    });

    it('laisse toujours ouvrir, même sans aucun droit d’écriture', () => {
      expect(gestesDeMedia(media(), {}, gestes()).map((a) => a.id)).toEqual(['ouvrir']);
      expect(gestesDeMedia(media(), { canWrite: true }, gestes()).map((a) => a.id)).toEqual([
        'ouvrir',
        'decrire'
      ]);
    });
  });

  describe('filtres', () => {
    const liste = [
      media({ id: 1, alt: 'Finale du tournoi', mimeType: 'image/webp' }),
      media({ id: 2, alt: 'Règlement intérieur', key: 'media/reglement.pdf', mimeType: 'application/pdf' }),
      media({ id: 3, alt: '', key: 'media/2026/affiche-stage.webp', mimeType: 'image/webp' })
    ];

    it('sépare les images des documents', () => {
      // Les documents n'ont pas de vignette : ils se noyaient entre deux photos.
      expect(mediasFiltres(liste, {}).map((m) => m.id)).toEqual([1, 2, 3]);
      expect(mediasFiltres(liste, { nature: 'images' }).map((m) => m.id)).toEqual([1, 3]);
      expect(mediasFiltres(liste, { nature: 'documents' }).map((m) => m.id)).toEqual([2]);
    });

    it('cherche dans la description et dans le nom du fichier', () => {
      expect(mediasFiltres(liste, { recherche: 'règlement' }).map((m) => m.id)).toEqual([2]);
      // Sans description, seul le nom du fichier permet de retrouver le média.
      expect(mediasFiltres(liste, { recherche: 'affiche' }).map((m) => m.id)).toEqual([3]);
    });

    it('croise les critères', () => {
      expect(
        mediasFiltres(liste, { recherche: 'media', nature: 'documents' }).map((m) => m.id)
      ).toEqual([2]);
    });
  });
});
