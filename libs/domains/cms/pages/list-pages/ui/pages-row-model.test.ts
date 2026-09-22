import { describe, it, expect, vi } from 'vitest';
import {
  dateFr,
  gestesDePage,
  ligneDePage,
  pagesFiltrees,
  signalementsDePage,
  type PageLike
} from './pages-row-model';

function page(s: Partial<PageLike> = {}): PageLike {
  return {
    id: 1,
    title: 'Présentation du club',
    path: '/presentation/',
    status: 'published',
    updatedAt: '2026-03-14T18:30:00',
    ...s
  };
}

const gestes = () => ({ onEdit: vi.fn(), onOpenSite: vi.fn(), onDelete: vi.fn() });
const TOUS = { canWrite: true, canDelete: true };

describe('pages-row-model', () => {
  describe('projection', () => {
    it('identifie par le titre et situe par l’adresse', () => {
      const l = ligneDePage(page());
      expect(l.titre).toBe('Présentation du club');
      expect(l.sousTitre).toBe('/presentation/');
      expect(l.valeur).toBe('14/03/2026');
      expect(l.ton).toBe('foreground');
    });

    it('éteint un brouillon : il ne paraît pas sur le site', () => {
      expect(ligneDePage(page({ status: 'draft' })).ton).toBe('muted');
    });

    it('lit les deux formats de date que l’écran reçoit', () => {
      // L'API répond en secondes, un formulaire en chaîne locale. Midi : aucun fuseau
      // ne peut faire basculer le jour.
      const secondes = Math.floor(new Date('2026-03-14T12:00:00').getTime() / 1000);
      expect(dateFr(secondes)).toBe('14/03/2026');
      expect(dateFr(null)).toBe('—');
      expect(dateFr('pas une date')).toBe('—');
    });

    it('ne signale que l’écart', () => {
      expect(signalementsDePage(page())).toEqual([]);
      expect(signalementsDePage(page({ status: 'draft' })).map((p) => p.label)).toEqual(['Brouillon']);
    });
  });

  describe('gestes', () => {
    it('met le geste courant en tête', () => {
      const actions = gestesDePage(page(), TOUS, gestes());
      expect(actions[0].id).toBe('modifier');
      expect(actions[0].tone).toBe('primary');
    });

    it('n’offre « Voir sur le site » qu’à une page en ligne', () => {
      /*
        L'adresse ne répond pas avant publication. L'entrée manquait entièrement à la
        carte mobile, qui n'alignait que « Modifier » et « Supprimer ».
      */
      expect(gestesDePage(page(), TOUS, gestes()).map((a) => a.id)).toContain('site');
      expect(gestesDePage(page({ status: 'draft' }), TOUS, gestes()).map((a) => a.id)).not.toContain(
        'site'
      );
    });

    it('ne double pas la question que l’écran pose déjà', () => {
      // La sienne rappelle de créer une redirection ; une formule générique le tairait.
      const actions = gestesDePage(page(), TOUS, gestes());
      expect(actions.every((a) => a.confirm === undefined)).toBe(true);
    });

    it('respecte les droits', () => {
      // Sans droit d'écriture ni de suppression, une page publiée reste consultable.
      expect(gestesDePage(page(), {}, gestes()).map((a) => a.id)).toEqual(['site']);
      expect(gestesDePage(page({ status: 'draft' }), {}, gestes())).toEqual([]);
      expect(gestesDePage(page(), { canWrite: true }, gestes()).map((a) => a.id)).toEqual([
        'modifier',
        'site'
      ]);
    });
  });

  describe('filtres', () => {
    const liste = [
      page({ id: 1, title: 'Présentation', path: '/presentation/', status: 'published' }),
      page({ id: 2, title: 'Le bureau', path: '/bureau/', status: 'draft' }),
      page({ id: 3, title: 'Tarifs', path: '/inscriptions/tarifs/', status: 'published' })
    ];

    it('sépare les brouillons des pages en ligne', () => {
      expect(pagesFiltrees(liste, {}).map((p) => p.id)).toEqual([1, 2, 3]);
      expect(pagesFiltrees(liste, { statut: 'draft' }).map((p) => p.id)).toEqual([2]);
      expect(pagesFiltrees(liste, { statut: 'published' }).map((p) => p.id)).toEqual([1, 3]);
    });

    it('cherche dans le titre et dans l’adresse', () => {
      expect(pagesFiltrees(liste, { recherche: 'bureau' }).map((p) => p.id)).toEqual([2]);
      // L'adresse seule : « inscriptions » n'apparaît dans aucun titre.
      expect(pagesFiltrees(liste, { recherche: 'inscriptions' }).map((p) => p.id)).toEqual([3]);
    });

    it('croise les deux critères', () => {
      expect(
        pagesFiltrees(liste, { recherche: 'e', statut: 'draft' }).map((p) => p.id)
      ).toEqual([2]);
    });
  });
});
