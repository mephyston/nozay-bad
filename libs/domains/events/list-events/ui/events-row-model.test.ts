import { describe, it, expect, vi } from 'vitest';
import {
  evenementsFiltres,
  evenementsOrdonnes,
  gestesDEvenement,
  libelleDeMois,
  ligneDEvenement,
  moisDe,
  quand,
  signalementsDEvenement,
  statutDEvenement,
  type EvenementLike
} from './events-row-model';

function evenement(s: Partial<EvenementLike> = {}): EvenementLike {
  return {
    id: 1,
    title: 'Tournoi de Nozay',
    startsAt: '2026-05-12T18:30',
    endsAt: null,
    venueLabel: 'Gymnase Pierre Dupuis',
    category: 'tournoi',
    status: 'published',
    registration: 'none',
    registrationCount: 0,
    attendeeCount: 0,
    ...s
  };
}

const gestes = () => ({
  onEdit: vi.fn(),
  onSetStatus: vi.fn(),
  onRegistrations: vi.fn(),
  onDelete: vi.fn()
});

const TOUS = { canWrite: true, canDelete: true, canReadRegistrations: true };

describe('events-row-model', () => {
  it('range l’agenda du plus proche au plus lointain', () => {
    const desordre = [
      evenement({ id: 1, startsAt: '2026-01-10T18:00' }),
      evenement({ id: 2, startsAt: '2026-09-01T18:00' }),
      evenement({ id: 3, startsAt: '2026-05-12T18:00' })
    ];
    expect(evenementsOrdonnes(desordre).map((e) => e.id)).toEqual([2, 3, 1]);

    // La liste confiée n'est pas modifiée.
    expect(desordre.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  describe('sections', () => {
    it('groupe par mois, et le nomme en français', () => {
      expect(moisDe(evenement())).toBe('2026-05');
      expect(libelleDeMois('2026-05')).toBe('mai 2026');
    });

    it('ne cale pas sur une clé illisible', () => {
      expect(libelleDeMois('bricole')).toBe('bricole');
    });
  });

  describe('projection', () => {
    it('situe par la date et le lieu', () => {
      const l = ligneDEvenement(evenement());
      expect(l.titre).toBe('Tournoi de Nozay');
      expect(l.sousTitre).toBe('12 mai 2026, 18:30 · Gymnase Pierre Dupuis');
      expect(l.ton).toBe('foreground');
    });

    it('se passe du lieu quand il n’y en a pas', () => {
      expect(ligneDEvenement(evenement({ venueLabel: null })).sousTitre).toBe('12 mai 2026, 18:30');
      expect(ligneDEvenement(evenement({ venueLabel: '  ' })).sousTitre).toBe('12 mai 2026, 18:30');
    });

    it('ne compte que là où l’on s’inscrit', () => {
      // Sans inscription, la colonne restait vide sur la moitié des lignes.
      expect(ligneDEvenement(evenement()).valeur).toBeUndefined();

      const ouvert = ligneDEvenement(
        evenement({ registration: 'open', registrationCount: 12, attendeeCount: 12 })
      );
      expect(ouvert.valeur).toBe('12');
      expect(ouvert.legende).toBe('inscrit(s)');
    });

    it('dit le nombre de personnes quand il dépasse celui des inscrits', () => {
      // « 12 inscrits, 18 personnes » n'est pas la même soirée pour le traiteur.
      const l = ligneDEvenement(
        evenement({ registration: 'open', registrationCount: 12, attendeeCount: 18 })
      );
      expect(l.valeur).toBe('12');
      expect(l.legende).toBe('18 personnes');
    });

    it('éteint un brouillon et alerte sur une annulation', () => {
      expect(statutDEvenement(evenement({ status: 'draft' })).ton).toBe('muted');
      expect(statutDEvenement(evenement({ status: 'cancelled' })).ton).toBe('destructive');
    });

    it('ne signale que les écarts', () => {
      expect(signalementsDEvenement(evenement())).toEqual([]);
      expect(signalementsDEvenement(evenement({ status: 'draft' })).map((p) => p.label)).toEqual([
        'Brouillon'
      ]);
      expect(signalementsDEvenement(evenement({ status: 'cancelled' })).map((p) => p.label)).toEqual([
        'Annulé'
      ]);
      // Publié mais fermé : la fiche paraît, plus personne ne s'y inscrit.
      expect(
        signalementsDEvenement(evenement({ registration: 'closed' })).map((p) => p.label)
      ).toEqual(['Inscriptions closes']);
    });

    it('lit une date sans fuseau sans décaler le jour', () => {
      expect(quand('2026-01-01T00:30')).toMatch(/1 janv\. 2026/);
      /*
        `new Date('pas une date:00')` ne lève pas et ne rend pas `Invalid Date` : il
        rend le 1er janvier 2000. Une valeur abîmée s'affichait donc comme une date
        plausible.
      */
      expect(quand('pas une date')).toBe('—');
      expect(quand('2026-05-12')).toBe('—');
      expect(quand('')).toBe('—');
    });
  });

  describe('gestes', () => {
    it('met l’étape du parcours en tête, et la retire une fois franchie', () => {
      const brouillon = gestesDEvenement(evenement({ status: 'draft' }), TOUS, gestes());
      expect(brouillon[0].id).toBe('publier');
      expect(brouillon[0].tone).toBe('primary');

      expect(gestesDEvenement(evenement(), TOUS, gestes()).map((a) => a.id)).not.toContain('publier');
    });

    it('fait porter sa question à l’annulation, que l’écran ne posait pas', () => {
      /*
        L'écran n'interrogeait rien : un doigt sur un bouton voisin retirait la fiche de
        l'agenda du site, et les inscrits la voyaient disparaître.
      */
      const annuler = gestesDEvenement(evenement(), TOUS, gestes()).find((a) => a.id === 'annuler');
      expect(annuler?.confirm).toContain('Tournoi de Nozay');
      expect(annuler?.confirm).toMatch(/republiée/);
    });

    it('ne double pas la question que l’écran pose déjà sur la suppression', () => {
      const supprimer = gestesDEvenement(evenement(), TOUS, gestes()).find(
        (a) => a.id === 'supprimer'
      );
      expect(supprimer?.confirm).toBeUndefined();
    });

    it('n’offre les inscrits que là où l’on s’inscrit, et avec le droit', () => {
      const ids = (e: EvenementLike, d = TOUS) => gestesDEvenement(e, d, gestes()).map((a) => a.id);
      expect(ids(evenement({ registration: 'open' }))).toContain('inscrits');
      expect(ids(evenement())).not.toContain('inscrits');
      expect(ids(evenement({ registration: 'open' }), { ...TOUS, canReadRegistrations: false })).not.toContain(
        'inscrits'
      );
    });

    it('respecte les droits', () => {
      expect(gestesDEvenement(evenement(), {}, gestes())).toEqual([]);
      expect(gestesDEvenement(evenement(), { canDelete: true }, gestes()).map((a) => a.id)).toEqual([
        'supprimer'
      ]);
    });
  });

  describe('filtres', () => {
    // L'horloge de la suite est figée au 2026-08-30 ; on l'injecte quand même, pour
    // que ces attentes ne dépendent pas d'un réglage global.
    const maintenant = () => new Date('2026-08-30T12:00:00Z');
    const liste = [
      evenement({ id: 1, startsAt: '2026-05-12T18:30', status: 'published' }),
      evenement({ id: 2, startsAt: '2026-10-03T18:30', status: 'draft', title: 'Stage jeunes' }),
      evenement({
        id: 3,
        startsAt: '2026-12-14T18:30',
        status: 'cancelled',
        category: 'assemblee',
        venueLabel: 'Halle des Sports'
      })
    ];

    it('sépare ce qui vient de ce qui est passé', () => {
      expect(evenementsFiltres(liste, { periode: 'avenir', maintenant }).map((e) => e.id)).toEqual([
        3, 2
      ]);
      expect(evenementsFiltres(liste, { periode: 'passes', maintenant }).map((e) => e.id)).toEqual([1]);
    });

    it('filtre par statut', () => {
      expect(evenementsFiltres(liste, { statut: 'draft', maintenant }).map((e) => e.id)).toEqual([2]);
      expect(evenementsFiltres(liste, { statut: 'cancelled', maintenant }).map((e) => e.id)).toEqual([3]);
    });

    it('cherche dans le titre, la catégorie et le lieu', () => {
      expect(evenementsFiltres(liste, { recherche: 'stage', maintenant }).map((e) => e.id)).toEqual([2]);
      expect(evenementsFiltres(liste, { recherche: 'halle', maintenant }).map((e) => e.id)).toEqual([3]);
      // La catégorie, que la rangée n'affiche pas : c'est la recherche qui la rend
      // atteignable.
      expect(evenementsFiltres(liste, { recherche: 'assemblée', maintenant }).map((e) => e.id)).toEqual(
        [3]
      );
      // Le terme se cherche dans les trois champs à la fois : ici le titre des deux
      // « Tournoi de Nozay », et la catégorie du stage.
      expect(evenementsFiltres(liste, { recherche: 'tournoi', maintenant }).map((e) => e.id)).toEqual([
        3, 2, 1
      ]);
    });

    it('croise les critères et rend la liste triée', () => {
      expect(
        evenementsFiltres(liste, { periode: 'avenir', statut: 'draft', maintenant }).map((e) => e.id)
      ).toEqual([2]);
      expect(evenementsFiltres(liste, { maintenant }).map((e) => e.id)).toEqual([3, 2, 1]);
    });
  });
});
