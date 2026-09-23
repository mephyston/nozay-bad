import { describe, it, expect } from 'vitest';
import { detailDeBloc, genreDeBloc } from './block-summary';

describe('block-summary', () => {
  it('nomme le genre du bloc, et ne cale pas sur un genre inconnu', () => {
    expect(genreDeBloc({ type: 'carousel' })).toBe('Carrousel');
    expect(genreDeBloc({ type: 'person_cards' })).toBe('Personnes');
    expect(genreDeBloc({ type: 'bricole' })).toBe('bricole');
  });

  it('préfère le titre de section : c’est ce que le lecteur verra', () => {
    expect(detailDeBloc({ type: 'carousel', heading: 'Nos partenaires' })).toBe('Nos partenaires');
    expect(detailDeBloc({ type: 'hero', title: 'Bienvenue au club' })).toBe('Bienvenue au club');
    expect(detailDeBloc({ type: 'pdf_link', label: 'Livret d’accueil' })).toBe('Livret d’accueil');
    // Un titre blanc ne compte pas pour un titre.
    expect(detailDeBloc({ type: 'carousel', heading: '   ', slides: [1, 2] })).toBe('2 diapositives');
  });

  it('dit ce que le bloc contient quand il n’a pas de titre', () => {
    expect(detailDeBloc({ type: 'carousel', slides: [1, 2, 3] })).toBe('3 diapositives');
    expect(detailDeBloc({ type: 'carousel', slides: [1] })).toBe('1 diapositive');
    expect(detailDeBloc({ type: 'gallery', mediaIds: [1, 2] })).toBe('2 images');
    expect(detailDeBloc({ type: 'columns', items: [1, 2] })).toBe('2 colonnes');
    expect(detailDeBloc({ type: 'person_cards', people: [1] })).toBe('1 personne');
    expect(detailDeBloc({ type: 'cta_grid', items: [1, 2, 3] })).toBe('3 boutons');
  });

  it('résume un texte riche en retirant ses balises', () => {
    expect(detailDeBloc({ type: 'richtext', html: '<p>Le club <strong>accueille</strong> tous</p>' })).toBe(
      'Le club accueille tous'
    );
    expect(detailDeBloc({ type: 'richtext', html: '<p>&nbsp;</p>' })).toBe('');
  });

  it('tronque un texte long plutôt que d’étirer la rangée', () => {
    const long = `<p>${'a'.repeat(120)}</p>`;
    const resume = detailDeBloc({ type: 'richtext', html: long });
    expect(resume).toHaveLength(61);
    expect(resume.endsWith('…')).toBe(true);
  });

  it('ne cale sur aucun bloc vide', () => {
    expect(detailDeBloc({ type: 'carousel' })).toBe('0 diapositive');
    expect(detailDeBloc({ type: 'schedule' })).toBe('');
    expect(detailDeBloc({ type: 'richtext' })).toBe('');
  });
});
