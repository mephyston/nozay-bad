import { describe, it, expect } from 'vitest';
import { normaliseBlockPayload, parseStoredBlock } from './block-payload';
import { CmsBlockPayloadError } from './errors';

describe('normaliseBlockPayload — richtext', () => {
  it('assainit avec le profil du site public : les titres survivent', () => {
    const block = normaliseBlockPayload('richtext', { html: '<h2>Tarifs</h2><p>2026</p>' }, 0);
    expect(block).toEqual({ type: 'richtext', html: '<h2>Tarifs</h2><p>2026</p>' });
  });

  it('retire ce que même le profil du site public refuse', () => {
    const block = normaliseBlockPayload('richtext', { html: '<p>Avant</p><script>alert(1)</script>' }, 0);
    expect(block).toEqual({ type: 'richtext', html: '<p>Avant</p>' });
  });

  it('refuse un bloc vide plutôt que de le laisser occuper une position', () => {
    expect(() => normaliseBlockPayload('richtext', { html: '<p>   </p>' }, 2)).toThrow(CmsBlockPayloadError);
    expect(() => normaliseBlockPayload('richtext', { html: '<p></p>' }, 2)).toThrow(/Bloc 3/);
  });

  it("accepte un bloc qui ne porte qu'une image", () => {
    const block = normaliseBlockPayload('richtext', { html: '<img src="/media/x/1.webp" alt="Équipe">' }, 0);
    expect(block).toMatchObject({ type: 'richtext' });
  });
});

describe('normaliseBlockPayload — liens', () => {
  it('jette une entrée dont la destination est refusée, et garde les autres', () => {
    const block = normaliseBlockPayload(
      'cta_grid',
      {
        columns: 2,
        items: [
          { label: 'Inscription', href: 'https://adherer.myffbad.fr/NBA91' },
          { label: 'Piège', href: 'javascript:alert(1)' },
          { label: 'Créneaux', href: '/creneaux/' }
        ]
      },
      0
    );
    expect(block).toMatchObject({
      type: 'cta_grid',
      items: [
        { label: 'Inscription', href: 'https://adherer.myffbad.fr/NBA91' },
        { label: 'Créneaux', href: '/creneaux/' }
      ]
    });
  });

  it("refuse une URL protocole-relative dans l'accroche", () => {
    const block = normaliseBlockPayload(
      'hero',
      { title: 'Bienvenue', ctas: [{ label: 'X', href: '//evil.example/x' }] },
      0
    );
    expect(block).toMatchObject({ ctas: [] });
  });
});

describe('normaliseBlockPayload — carrousel', () => {
  const slide = { mediaId: 12, title: 'Tournoi de printemps' };

  it("garde la carte mais retire le bouton dont la destination est refusée", () => {
    // Écart assumé avec `cta_grid`, où l'entrée entière disparaît : ici l'image, le
    // titre et la description valent d'être lus sans le bouton.
    const block = normaliseBlockPayload(
      'carousel',
      {
        slides: [
          { ...slide, description: 'Le 12 avril', ctaLabel: 'Voir', ctaHref: 'javascript:alert(1)' },
          { mediaId: 13, title: 'Créneaux', ctaLabel: 'Consulter', ctaHref: '/creneaux/' }
        ]
      },
      0
    );
    // `toEqual` et non `toMatchObject` : ce qui est vérifié ici, c'est justement
    // l'**absence** des deux clés du bouton sur la première carte.
    expect(block).toEqual({
      type: 'carousel',
      slides: [
        { mediaId: 12, title: 'Tournoi de printemps', description: 'Le 12 avril' },
        { mediaId: 13, title: 'Créneaux', ctaLabel: 'Consulter', ctaHref: '/creneaux/' }
      ]
    });
  });

  it("retire un bouton dont il manque le libellé ou l'adresse", () => {
    const block = normaliseBlockPayload(
      'carousel',
      { slides: [{ ...slide, ctaHref: '/creneaux/' }, { mediaId: 13, title: 'B', ctaLabel: 'Voir' }] },
      0
    );
    expect(block).toEqual({
      type: 'carousel',
      slides: [
        { mediaId: 12, title: 'Tournoi de printemps' },
        { mediaId: 13, title: 'B' }
      ]
    });
  });

  it('refuse une diapositive sans image, en la désignant par son rang', () => {
    // Le message est lu par un bénévole : « /slides/1/mediaId — Expected integer »
    // ne lui dirait pas quelle carte reprendre.
    expect(() =>
      normaliseBlockPayload('carousel', { slides: [slide, { mediaId: 0, title: 'B' }] }, 0)
    ).toThrow(/diapositive 2 : choisissez une image/);
  });

  it('refuse une diapositive sans titre', () => {
    expect(() =>
      normaliseBlockPayload('carousel', { slides: [{ mediaId: 12, title: '   ' }] }, 3)
    ).toThrow(/Bloc 4.*diapositive 1 : le titre est vide/);
  });

  it('rogne le titre et le libellé du bouton', () => {
    const block = normaliseBlockPayload(
      'carousel',
      { slides: [{ mediaId: 12, title: '  Tournoi  ', ctaLabel: '  Voir  ', ctaHref: '/x/' }] },
      0
    );
    expect(block).toMatchObject({ slides: [{ title: 'Tournoi', ctaLabel: 'Voir' }] });
  });
});

describe('normaliseBlockPayload — intégrations', () => {
  it("refuse une adresse complète là où un identifiant est attendu", () => {
    expect(() =>
      normaliseBlockPayload(
        'embed',
        { provider: 'youtube', resourceId: 'https://youtu.be/T4_qiRVEXcI', title: 'Blackminton', aspect: '16/9' },
        0
      )
    ).toThrow(/identifiant/);
  });

  it('accepte un identifiant de ressource', () => {
    const block = normaliseBlockPayload(
      'embed',
      { provider: 'youtube', resourceId: 'T4_qiRVEXcI', title: 'Blackminton', aspect: '16/9' },
      0
    );
    expect(block).toMatchObject({ provider: 'youtube', resourceId: 'T4_qiRVEXcI' });
  });

  it("accepte l'adresse d'un agenda Google, qui n'est pas un jeton", () => {
    // Un contrôle unique pour tous les fournisseurs refusait tout agenda, alors que
    // l'écran en demande précisément l'adresse.
    for (const resourceId of ['nozaybad@gmail.com', 'abc123@group.calendar.google.com']) {
      const block = normaliseBlockPayload(
        'embed',
        { provider: 'google_calendar', resourceId, title: 'Agenda du club', aspect: '4/3' },
        0
      );
      expect(block).toMatchObject({ provider: 'google_calendar', resourceId });
    }
  });

  it("refuse une URL d'intégration collée à la place de l'adresse de l'agenda", () => {
    expect(() =>
      normaliseBlockPayload(
        'embed',
        {
          provider: 'google_calendar',
          resourceId: 'https://calendar.google.com/calendar/embed?src=nozaybad@gmail.com',
          title: 'Agenda du club',
          aspect: '4/3'
        },
        0
      )
    ).toThrow(/adresse/);
  });

  it("n'accepte pas une adresse là où un jeton est attendu", () => {
    // La contrepartie : l'assouplissement ne doit valoir que pour l'agenda.
    expect(() =>
      normaliseBlockPayload(
        'embed',
        { provider: 'youtube', resourceId: 'nozaybad@gmail.com', title: 'Vidéo', aspect: '16/9' },
        0
      )
    ).toThrow(/identifiant/);
  });

  it('exige une hauteur pour un cadre à taille fixe, sinon la page se décale', () => {
    expect(() =>
      normaliseBlockPayload(
        'embed',
        { provider: 'google_sheet', resourceId: '1x59I6JmseheU7cfzLwy', title: 'Créneaux', aspect: 'fixed' },
        0
      )
    ).toThrow(/hauteur/);
  });
});

describe('normaliseBlockPayload — robustesse', () => {
  it("retire les champs d'état de l'éditeur au lieu de refuser la page", () => {
    const block = normaliseBlockPayload(
      'richtext',
      { html: '<p>Texte</p>', _localId: 'tmp-3', _collapsed: true },
      0
    );
    expect(block).toEqual({ type: 'richtext', html: '<p>Texte</p>' });
  });

  it('situe l\'erreur à l\'écran par son rang', () => {
    expect(() => normaliseBlockPayload('hero', { subtitle: 'sans titre', ctas: [] }, 4)).toThrow(/Bloc 5/);
  });

  it('refuse un type inconnu', () => {
    expect(() => normaliseBlockPayload('diaporama' as never, {}, 0)).toThrow(/inconnu/);
  });

  it('déduplique une galerie', () => {
    const block = normaliseBlockPayload('gallery', { mediaIds: [3, 7, 3, 7, 9], layout: 'grid' }, 0);
    expect(block).toMatchObject({ mediaIds: [3, 7, 9] });
  });

  it('efface une adresse électronique mal formée plutôt que de produire un mailto cassé', () => {
    const block = normaliseBlockPayload(
      'person_cards',
      {
        people: [
          { name: 'Fabien', role: 'Président', responsibilities: [], email: 'pas-une-adresse' },
          { name: 'Justine', role: 'Secrétaire', responsibilities: [], email: 'bureau@nozaybad.fr' }
        ]
      },
      0
    );
    expect(block).toMatchObject({
      people: [
        { name: 'Fabien', email: undefined },
        { name: 'Justine', email: 'bureau@nozaybad.fr' }
      ]
    });
  });
});

describe('normaliseBlockPayload — columns', () => {
  const two = (a: string, b: string) => ({ items: [{ html: a }, { html: b }] });

  it('assainit chaque colonne au profil du site public', () => {
    const block = normaliseBlockPayload(
      'columns',
      two('<h2>Jeunes</h2><script>alert(1)</script>', '<p>Adultes</p>'),
      0
    );
    expect(block).toEqual({
      type: 'columns',
      items: [{ html: '<h2>Jeunes</h2>' }, { html: '<p>Adultes</p>' }]
    });
  });

  it('refuse une colonne vide, qui décalerait ses voisines', () => {
    expect(() => normaliseBlockPayload('columns', two('<p>A</p>', '<p>  </p>'), 1)).toThrow(
      /colonne 2/
    );
  });

  it("accepte une colonne qui ne porte qu'une image", () => {
    const block = normaliseBlockPayload(
      'columns',
      { items: [{ html: '<p>A</p>' }, { html: '<p></p>', mediaId: 4 }] },
      0
    );
    expect(block).toMatchObject({ items: [{ html: '<p>A</p>' }, { mediaId: 4 }] });
  });

  it('refuse moins de deux colonnes, et plus de trois', () => {
    expect(() => normaliseBlockPayload('columns', { items: [{ html: '<p>A</p>' }] }, 0)).toThrow(
      CmsBlockPayloadError
    );
    expect(() =>
      normaliseBlockPayload('columns', { items: Array(4).fill({ html: '<p>A</p>' }) }, 0)
    ).toThrow(CmsBlockPayloadError);
  });
});

describe('parseStoredBlock', () => {
  it('relit une ligne saine', () => {
    expect(parseStoredBlock('richtext', '{"type":"richtext","html":"<p>A</p>"}')).toEqual({
      type: 'richtext',
      html: '<p>A</p>'
    });
  });

  it('rend null sur une ligne corrompue plutôt que de faire tomber la page', () => {
    expect(parseStoredBlock('richtext', 'pas du json')).toBeNull();
    expect(parseStoredBlock('richtext', '{"type":"hero"}')).toBeNull();
    expect(parseStoredBlock('inconnu', '{}')).toBeNull();
  });
});
