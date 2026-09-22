import { describe, it, expect } from 'vitest';
import {
  appareilDe,
  audienceDe,
  ligneDAbonne,
  ligneDeMessage,
  ligneProgrammee,
  refusDEnvoi,
  rubriquesDeNotifications,
  signalementsDEnvoi,
  type AbonneLike,
  type MessageLike,
  type ProgrammeeLike,
  type StatsLike
} from './notifications-row-model';

const stats = (s: Partial<StatsLike> = {}): StatsLike => ({
  devices: 12,
  accounts: 8,
  pending: 0,
  ...s
});

const message = (s: Partial<MessageLike> = {}): MessageLike => ({
  id: 1,
  title: 'Tournoi interne samedi',
  body: 'Inscriptions ouvertes.',
  target: 'all',
  targetDetail: null,
  category: 'announcement',
  source: 'admin',
  createdAt: '2026-03-14T18:30:00',
  sent: 10,
  failed: 0,
  pending: 0,
  ...s
});

const programmee = (s: Partial<ProgrammeeLike> = {}): ProgrammeeLike => ({
  id: 'rappel',
  title: 'Rappel de créneau',
  body: 'Le gymnase ouvre ce soir.',
  schedule: 'Chaque lundi à 9 h',
  trigger: 'cron',
  category: 'announcement',
  enabled: true,
  ...s
});

const brouillon = {
  title: 'Titre',
  body: 'Message',
  target: 'all' as const,
  selectedGroups: [] as string[]
};

describe('notifications-row-model', () => {
  describe('refusDEnvoi', () => {
    it('laisse partir un envoi complet', () => {
      expect(refusDEnvoi(brouillon, stats())).toBeNull();
    });

    it('exige un titre et un message, espaces exclus', () => {
      expect(refusDEnvoi({ ...brouillon, title: '   ' }, stats())).toMatch(/obligatoires/);
      expect(refusDEnvoi({ ...brouillon, body: '' }, stats())).toMatch(/obligatoires/);
    });

    it('exige au moins un groupe quand la cible en est une', () => {
      const parGroupes = { ...brouillon, target: 'groups' as const };
      expect(refusDEnvoi(parGroupes, stats())).toMatch(/au moins un groupe/);
      expect(refusDEnvoi({ ...parGroupes, selectedGroups: ['Loisirs'] }, stats())).toBeNull();
    });

    it('refuse « tous les abonnés » quand aucun appareil ne l’est', () => {
      /*
        Sans cette règle, l'envoi part dans le vide : la file accepte le message, aucun
        appareil ne le reçoit, et rien à l'écran ne distingue ce cas d'une diffusion
        réussie. Elle ne vaut que pour « tous » — les autres cibles se comptent côté
        serveur, qui sait seul qui doit sa cotisation.
      */
      expect(refusDEnvoi(brouillon, stats({ devices: 0 }))).toMatch(/Aucun appareil/);
      expect(refusDEnvoi({ ...brouillon, target: 'unpaid' }, stats({ devices: 0 }))).toBeNull();
    });
  });

  it('annonce l’audience en toutes lettres', () => {
    expect(audienceDe(brouillon, stats())).toBe('12 appareil(s)');
    expect(audienceDe({ ...brouillon, target: 'unpaid' }, stats())).toMatch(/cotisation reste due/);
    expect(
      audienceDe({ ...brouillon, target: 'groups', selectedGroups: ['Loisirs', 'Compét'] }, stats())
    ).toBe('les groupes : Loisirs, Compét');
  });

  describe('rubriquesDeNotifications', () => {
    it('porte le compte de chaque rubrique', () => {
      const r = rubriquesDeNotifications({
        stats: stats(),
        messages: [message(), message({ id: 2 })],
        programmees: [programmee(), programmee({ id: 'x', trigger: 'event' })]
      });
      expect(r.map((x) => [x.id, x.valeur])).toEqual([
        ['historique', '2'],
        ['abonnements', '12'],
        ['programmees', '1'],
        ['evenements', '1']
      ]);
    });

    it('ne reprend pas le nom de la page dans ses rubriques', () => {
      // « Notifications sur événement » débordait la barre de la feuille.
      const r = rubriquesDeNotifications({
        stats: stats(),
        messages: [],
        programmees: [programmee(), programmee({ id: 'x', trigger: 'event' })]
      });
      expect(r.every((x) => !/notification/i.test(x.titre))).toBe(true);
      expect(r.map((x) => x.titre)).toEqual([
        'Historique des envois',
        'Abonnements',
        'Envois programmés',
        'Envois sur événement'
      ]);
    });

    it('tait les registres vides, plutôt que d’afficher deux rangées à zéro', () => {
      const r = rubriquesDeNotifications({ stats: stats(), messages: [], programmees: [] });
      expect(r.map((x) => x.id)).toEqual(['historique', 'abonnements']);
    });

    it('ne mentionne les envois en attente que s’il y en a', () => {
      const sans = rubriquesDeNotifications({ stats: stats(), messages: [], programmees: [] });
      expect(sans[1].sousTitre).toBe('8 compte(s) adhérent(s)');

      const avec = rubriquesDeNotifications({
        stats: stats({ pending: 3 }),
        messages: [],
        programmees: []
      });
      expect(avec[1].sousTitre).toBe('8 compte(s) adhérent(s) · 3 envoi(s) en attente');
    });
  });

  describe('projections', () => {
    it('situe un envoi et prend le nombre d’appareils atteints pour valeur', () => {
      const l = ligneDeMessage(message());
      expect(l.titre).toBe('Tournoi interne samedi');
      expect(l.sousTitre).toBe('14/03/2026 18:30 · Communications du bureau · Tous les abonnés');
      expect(l.valeur).toBe('10');
      expect(l.ton).toBe('success');
    });

    it('nomme l’origine d’un envoi automatique, et tait celle de l’admin', () => {
      expect(ligneDeMessage(message({ source: 'cron' })).sousTitre).toMatch(/· cron$/);
      expect(ligneDeMessage(message()).sousTitre).not.toMatch(/admin/);
    });

    it('précise le détail d’une cible quand il y en a un', () => {
      expect(ligneDeMessage(message({ target: 'groups', targetDetail: 'Loisirs' })).sousTitre).toMatch(
        /Groupes \(Loisirs\)/
      );
    });

    it('éteint le ton d’un envoi sans destinataire, et alerte sur un échec', () => {
      expect(ligneDeMessage(message({ sent: 0 })).ton).toBe('muted');
      expect(ligneDeMessage(message({ failed: 2 })).ton).toBe('destructive');
    });

    it('ne signale que ce qui sort de l’ordinaire', () => {
      // « 10 envoyée(s) » est la valeur de la rangée : l'écrire en pastille la doublait.
      expect(signalementsDEnvoi(message())).toEqual([]);
      expect(signalementsDEnvoi(message({ pending: 2, failed: 1 })).map((p) => p.label)).toEqual([
        '2 en attente',
        '1 en échec'
      ]);
    });

    it('identifie un abonné par les adhérents qu’il joint', () => {
      const abonne = (s: Partial<AbonneLike> = {}): AbonneLike => ({
        id: 1,
        email: 'jean@example.org',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',
        createdAt: '2026-01-05T10:00:00',
        lastSuccessAt: null,
        members: [
          { name: 'Jean Dupont', group: 'Loisirs' },
          { name: 'Marie Dupont', group: 'Loisirs' }
        ],
        ...s
      });

      const l = ligneDAbonne(abonne());
      expect(l.titre).toBe('Jean Dupont, Marie Dupont');
      // Le groupe n'est cité qu'une fois : deux adhérents du même groupe le partagent.
      expect(l.sousTitre).toBe('Loisirs · jean@example.org');
      expect(l.valeur).toBe('iPhone');

      // Un appareil qu'aucun adhérent ne réclame s'éteint, et n'a que son adresse.
      const orphelin = ligneDAbonne(abonne({ members: [] }));
      expect(orphelin.titre).toBe('Compte non rattaché');
      expect(orphelin.sousTitre).toBe('jean@example.org');
      expect(orphelin.ton).toBe('muted');
    });

    it('reconnaît les appareils courants', () => {
      expect(appareilDe('Mozilla/5.0 (iPhone)')).toBe('iPhone');
      expect(appareilDe('Mozilla/5.0 (Linux; Android 14)')).toBe('Android');
      expect(appareilDe('Mozilla/5.0 (Macintosh; Intel Mac OS X)')).toBe('Mac');
      expect(appareilDe(null)).toBe('Appareil inconnu');
      expect(appareilDe('Nokia 3310')).toBe('Autre');
    });

    it('dit d’un envoi récurrent s’il part, et d’un envoi métier ce qu’il annonce', () => {
      expect(ligneProgrammee(programmee()).valeur).toBe('Active');
      expect(ligneProgrammee(programmee({ enabled: false })).valeur).toBe('Désactivée');
      expect(ligneProgrammee(programmee({ enabled: false })).ton).toBe('muted');
      expect(ligneProgrammee(programmee({ trigger: 'event', category: 'announcement' })).valeur).toBe(
        'Communications du bureau'
      );
    });
  });
});
