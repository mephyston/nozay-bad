import { describe, it, expect, vi } from 'vitest';
import {
  creneauxFiltres,
  creneauxOrdonnes,
  gestesDeCreneau,
  libelleDeJour,
  ligneDeCreneau,
  signalementsDeCreneau,
  type CreneauLike
} from './schedules-row-model';

function creneau(s: Partial<CreneauLike> = {}): CreneauLike {
  return {
    id: 1,
    weekday: 1,
    startTime: '18:00',
    endTime: '19:30',
    audience: 'jeunes',
    label: null,
    active: true,
    indiv: false,
    venueId: 7,
    venue: { name: 'Gymnase des Bruyères' },
    ...s
  };
}

const gestes = () => ({ onEdit: vi.fn(), onToggle: vi.fn(), onDelete: vi.fn() });

describe('schedules-row-model', () => {
  it('range la semaine par jour puis par heure', () => {
    /*
      L'API rend les lignes dans l'ordre de création. Les sections d'une liste suivent
      l'ordre d'apparition : sans ce tri, « Lundi » revenait plus bas, après un mardi.
    */
    const desordre = [
      creneau({ id: 1, weekday: 3, startTime: '20:00' }),
      creneau({ id: 2, weekday: 1, startTime: '20:00' }),
      creneau({ id: 3, weekday: 3, startTime: '18:00' }),
      creneau({ id: 4, weekday: 1, startTime: '18:00' })
    ];
    expect(creneauxOrdonnes(desordre).map((c) => c.id)).toEqual([4, 2, 3, 1]);
  });

  it('ne modifie pas la liste qu’on lui confie', () => {
    const liste = [creneau({ id: 1, weekday: 3 }), creneau({ id: 2, weekday: 1 })];
    creneauxOrdonnes(liste);
    expect(liste.map((c) => c.id)).toEqual([1, 2]);
  });

  describe('projection', () => {
    it('identifie par le groupe et situe par le gymnase', () => {
      const l = ligneDeCreneau(creneau());
      expect(l.titre).toBe('Jeunes');
      expect(l.sousTitre).toBe('Gymnase des Bruyères');
      expect(l.valeur).toBe('18:00');
      expect(l.legende).toBe('→ 19:30');
      expect(l.ton).toBe('foreground');
    });

    it('laisse l’intitulé remplacer le nom du groupe, qui descend en sous-titre', () => {
      const l = ligneDeCreneau(creneau({ label: 'Loisirs 1' }));
      expect(l.titre).toBe('Loisirs 1');
      expect(l.sousTitre).toBe('Jeunes · Gymnase des Bruyères');

      // Un intitulé vide ou blanc rend la main au groupe, sans point orphelin.
      expect(ligneDeCreneau(creneau({ label: '   ' })).titre).toBe('Jeunes');
      expect(ligneDeCreneau(creneau({ label: '   ' })).sousTitre).toBe('Gymnase des Bruyères');
    });

    it('ne dit pas deux fois la même chose quand l’intitulé reprend le groupe', () => {
      // « Poussins (U11) · Poussins (U11) » : le cas est fréquent, les intitulés du
      // club reprenant souvent le nom du groupe mot pour mot.
      const l = ligneDeCreneau(creneau({ audience: 'poussins', label: 'Poussins (U11)' }));
      expect(l.titre).toBe('Poussins (U11)');
      expect(l.sousTitre).toBe('Gymnase des Bruyères');
    });

    it('éteint un créneau masqué : il ne paraît pas sur le site', () => {
      expect(ligneDeCreneau(creneau({ active: false })).ton).toBe('muted');
    });

    it('ne signale que les écarts', () => {
      // Paraître sur le site est le cas courant : c'est l'absence qui se dit.
      expect(signalementsDeCreneau(creneau())).toEqual([]);
      expect(signalementsDeCreneau(creneau({ active: false })).map((p) => p.label)).toEqual(['Masqué']);
      expect(signalementsDeCreneau(creneau({ indiv: true })).map((p) => p.label)).toEqual(['Indiv']);
    });

    it('nomme les jours, et ne cale pas sur un jour inconnu', () => {
      expect(libelleDeJour(1)).toBe('Lundi');
      expect(libelleDeJour(7)).toBe('Dimanche');
      expect(libelleDeJour(0)).toBe('Jour inconnu');
      expect(libelleDeJour(99)).toBe('Jour inconnu');
    });
  });

  describe('gestes', () => {
    it('met en tête le geste courant, qui se défait', () => {
      const affiche = gestesDeCreneau(creneau(), { canWrite: true, ...gestes() });
      expect(affiche[0].id).toBe('masquer');
      expect(affiche[0].label).toBe('Masquer du site');
      expect(affiche[0].tone).toBe('primary');

      expect(gestesDeCreneau(creneau({ active: false }), { canWrite: true, ...gestes() })[0].label).toBe(
        'Réafficher'
      );
    });

    it('ne double pas la question que l’écran pose déjà', () => {
      /*
        L'écran explique qu'il vaut mieux masquer pour un retrait temporaire, l'historique
        étant conservé. Une question générique ne le dirait pas.
      */
      const actions = gestesDeCreneau(creneau(), { canWrite: true, ...gestes() });
      expect(actions.every((a) => a.confirm === undefined)).toBe(true);
    });

    it('n’offre rien sans le droit d’écrire', () => {
      expect(gestesDeCreneau(creneau(), { canWrite: false, ...gestes() })).toEqual([]);
    });
  });

  describe('filtres', () => {
    const liste = [
      creneau({ id: 1, weekday: 1, audience: 'jeunes', active: true }),
      creneau({ id: 2, weekday: 2, audience: 'adultes_loisir', active: false }),
      creneau({ id: 3, weekday: 1, audience: 'minibad', active: true, venue: { name: 'Salle Dulac' } })
    ];

    it('sépare ce qui paraît de ce qui est retiré', () => {
      expect(creneauxFiltres(liste, {}).map((c) => c.id)).toEqual([1, 3, 2]);
      expect(creneauxFiltres(liste, { visibilite: 'affiches' }).map((c) => c.id)).toEqual([1, 3]);
      expect(creneauxFiltres(liste, { visibilite: 'masques' }).map((c) => c.id)).toEqual([2]);
    });

    it('cherche dans le jour, le groupe, l’intitulé et le gymnase', () => {
      expect(creneauxFiltres(liste, { recherche: 'mardi' }).map((c) => c.id)).toEqual([2]);
      expect(creneauxFiltres(liste, { recherche: 'minibad' }).map((c) => c.id)).toEqual([3]);
      expect(creneauxFiltres(liste, { recherche: 'dulac' }).map((c) => c.id)).toEqual([3]);
      expect(creneauxFiltres(liste, { recherche: 'bruyères' }).map((c) => c.id)).toEqual([1, 2]);
    });

    it('croise la recherche et la visibilité', () => {
      expect(
        creneauxFiltres(liste, { recherche: 'bruyères', visibilite: 'masques' }).map((c) => c.id)
      ).toEqual([2]);
    });

    it('rend la liste triée même sans critère', () => {
      expect(creneauxFiltres(liste, {}).map((c) => c.weekday)).toEqual([1, 1, 2]);
    });
  });
});
