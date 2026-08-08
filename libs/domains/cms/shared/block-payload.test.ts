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
    expect(() => normaliseBlockPayload('carousel' as never, {}, 0)).toThrow(/inconnu/);
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
