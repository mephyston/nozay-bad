import { describe, it, expect } from 'vitest';
import { blockText } from './handler';

describe('blockText', () => {
  it('extrait le texte lisible des blocs, HTML compris, et ignore les réglages', () => {
    const payload = {
      type: 'hero',
      title: 'Bienvenue au club',
      subtitle: 'Badminton pour tous',
      align: 'center',
      mediaId: 12,
      items: [{ label: 'S’inscrire', href: '/inscription', html: '<p>Dès <strong>septembre</strong>&nbsp;!</p>' }]
    };
    expect(blockText(payload)).toBe('Bienvenue au club Badminton pour tous S’inscrire Dès septembre !');
  });

  it('rend une chaîne vide pour ce qui n’est pas un bloc', () => {
    expect(blockText(null)).toBe('');
    expect(blockText('texte')).toBe('');
  });
});
