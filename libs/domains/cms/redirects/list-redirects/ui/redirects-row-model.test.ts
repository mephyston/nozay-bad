import { describe, it, expect, vi } from 'vitest';
import {
  estDefinitive,
  gestesDeRedirection,
  ligneDeRedirection,
  redirectionsFiltrees,
  signalementsDeRedirection,
  visites,
  type RedirectionLike
} from './redirects-row-model';

function redirection(s: Partial<RedirectionLike> = {}): RedirectionLike {
  return {
    id: 1,
    fromPath: '/ancienne-page/',
    toPath: '/presentation/',
    statusCode: 301,
    hitCount: 12,
    note: null,
    createdAt: '2026-03-14T18:30:00',
    ...s
  };
}

const gestes = () => ({ onEdit: vi.fn(), onDelete: vi.fn() });

describe('redirects-row-model', () => {
  describe('projection', () => {
    it('identifie par l’ancienne adresse et situe par la cible', () => {
      const l = ligneDeRedirection(redirection());
      expect(l.titre).toBe('/ancienne-page/');
      expect(l.sousTitre).toBe('→ /presentation/');
      expect(l.valeur).toBe('12');
      expect(l.legende).toBe('visites');
      expect(l.ton).toBe('foreground');
    });

    it('dit qu’une adresse sans cible ne répond plus', () => {
      // Sans `toPath`, le site répond « 410 Gone » : supprimée pour de bon, pas déplacée.
      const l = ligneDeRedirection(redirection({ toPath: null }));
      expect(estDefinitive(redirection({ toPath: null }))).toBe(true);
      expect(l.sousTitre).toBe('Ne répond plus');
    });

    it('éteint une redirection que personne n’emprunte', () => {
      const l = ligneDeRedirection(redirection({ hitCount: 0 }));
      expect(l.valeur).toBe('0');
      expect(l.legende).toBe('jamais');
      expect(l.ton).toBe('muted');
    });

    it('accorde le mot « visite »', () => {
      expect(visites(0)).toBe('jamais empruntée');
      expect(visites(1)).toBe('1 visite');
      expect(visites(3)).toBe('3 visites');
    });

    it('ne signale que l’écart', () => {
      // Rediriger est le cas courant ; déclarer une adresse supprimée ne l'est pas.
      expect(signalementsDeRedirection(redirection())).toEqual([]);
      expect(signalementsDeRedirection(redirection({ toPath: null })).map((p) => p.label)).toEqual([
        'Supprimée'
      ]);
    });
  });

  describe('gestes', () => {
    it('ne double pas la question que l’écran pose déjà', () => {
      /*
        La sienne change selon le nombre de visites : « cette adresse a encore été
        empruntée » ne se dit pas d'une redirection que personne n'emprunte. Une
        formule générique perdrait ce qui aide à décider.
      */
      const actions = gestesDeRedirection(redirection(), { canWrite: true, ...gestes() });
      expect(actions.map((a) => a.id)).toEqual(['modifier', 'supprimer']);
      expect(actions.every((a) => a.confirm === undefined)).toBe(true);
    });

    it('n’offre rien sans le droit d’écrire', () => {
      expect(gestesDeRedirection(redirection(), { canWrite: false, ...gestes() })).toEqual([]);
    });
  });

  describe('filtres', () => {
    const liste = [
      redirection({ id: 1, fromPath: '/vieux-club/', toPath: '/presentation/', hitCount: 5 }),
      redirection({ id: 2, fromPath: '/promo/', toPath: null, hitCount: 0 }),
      redirection({ id: 3, fromPath: '/tarifs-2020/', toPath: '/tarifs/', hitCount: 0, note: 'WordPress' })
    ];

    it('sépare les déplacées des supprimées', () => {
      expect(redirectionsFiltrees(liste, {}).map((r) => r.id)).toEqual([1, 2, 3]);
      expect(redirectionsFiltrees(liste, { nature: 'redirect' }).map((r) => r.id)).toEqual([1, 3]);
      expect(redirectionsFiltrees(liste, { nature: 'gone' }).map((r) => r.id)).toEqual([2]);
    });

    it('retrouve celles que personne n’emprunte', () => {
      // Après une migration, on accumule des redirections dont on ne sait plus si elles
      // servent : il fallait lire la table entière pour les repérer.
      expect(redirectionsFiltrees(liste, { nature: 'inutilisees' }).map((r) => r.id)).toEqual([2, 3]);
    });

    it('cherche dans les deux adresses et dans la note', () => {
      expect(redirectionsFiltrees(liste, { recherche: 'vieux' }).map((r) => r.id)).toEqual([1]);
      expect(redirectionsFiltrees(liste, { recherche: 'presentation' }).map((r) => r.id)).toEqual([1]);
      expect(redirectionsFiltrees(liste, { recherche: 'wordpress' }).map((r) => r.id)).toEqual([3]);
    });

    it('croise les critères', () => {
      expect(
        redirectionsFiltrees(liste, { recherche: 'tarifs', nature: 'inutilisees' }).map((r) => r.id)
      ).toEqual([3]);
    });
  });
});
