import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { LookupHouseholdRepository, licenceCandidates } from './repository';
import { insertMemberFixture, insertMemberFixtures } from '@nba/members/test-fixtures';

// Date figée à l'intérieur de la saison 25-26 : les tests ne doivent rien devoir à
// l'horloge de la machine qui les exécute.
const TODAY = '2026-01-15';

describe('LookupHouseholdRepository', () => {
  let db: any;
  let previousId = 0;
  let currentId = 0;
  let nextId = 0;
  let oldestId = 0;
  const repo = new LookupHouseholdRepository();

  const baseMember = {
    gender: 'M' as const,
    birthDate: '2010-01-01',
    type: 'jeune',
    importedAt: new Date()
  };

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    const seasons = await db
      .insert(seasonsTable)
      .values([
        { code: '23-24', name: 'Saison 23-24', startDate: '2023-09-01', endDate: '2024-08-31', active: false, createdAt: new Date() },
        { code: '24-25', name: 'Saison 24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: false, createdAt: new Date() },
        // Saison en cours au regard de TODAY. Volontairement PAS la saison comptable :
        // le drapeau `active` ne doit jouer aucun rôle ici.
        { code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: false, createdAt: new Date() },
        { code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31', active: true, createdAt: new Date() }
      ])
      .returning()
      .all();

    oldestId = seasons.find((s: any) => s.code === '23-24').id;
    previousId = seasons.find((s: any) => s.code === '24-25').id;
    currentId = seasons.find((s: any) => s.code === '25-26').id;
    nextId = seasons.find((s: any) => s.code === '26-27').id;

    // Foyer sur la saison en cours : deux enfants (email du parent en contact) + le parent.
    await insertMemberFixtures(db, [
      { ...baseMember, seasonId: currentId, licence: '1000001', lastName: 'Martin', firstName: 'Léa', gender: 'F', email: null, parent1Email: 'parent@ex.fr' },
      { ...baseMember, seasonId: currentId, licence: '1000002', lastName: 'Martin', firstName: 'Tom', email: null, parent1Email: 'parent@ex.fr' },
      { ...baseMember, seasonId: currentId, licence: '1000003', lastName: 'Martin', firstName: 'Papa', email: 'Parent@Ex.fr', type: 'adulte', birthDate: '1980-01-01', paid: true },
      // Adhérent sans lien, saison en cours.
      { ...baseMember, seasonId: currentId, licence: '2000001', lastName: 'Durand', firstName: 'Zoé', gender: 'F', email: 'autre@ex.fr' }
    ]);
  });

  const lookup = (identifier: string) => repo.lookup(db, identifier, TODAY);

  describe('licence en cours → accès', () => {
    it('retourne tout le foyer à partir de l’email (adhérent + contacts parent), insensible à la casse', async () => {
      const res = await lookup('parent@ex.fr');
      expect(res.status).toBe('granted');
      expect(res.accountEmail).toBe('parent@ex.fr');
      expect(res.members.map((m) => m.licence).sort()).toEqual(['1000001', '1000002', '1000003']);
      expect(res.seasonCode).toBe('25-26');
    });

    it('accepte l’email en casse différente', async () => {
      const res = await lookup('PARENT@EX.FR');
      expect(res.members).toHaveLength(3);
    });

    it('remonte le statut de paiement (paid) de chaque membre', async () => {
      const res = await lookup('parent@ex.fr');
      expect(res.members.find((m) => m.firstName === 'Papa')?.paid).toBe(true);
      expect(res.members.find((m) => m.firstName === 'Léa')?.paid).toBe(false);
    });

    it('résout la licence d’un enfant vers l’email du foyer et débloque tout le foyer', async () => {
      const res = await lookup('1000001');
      expect(res.status).toBe('granted');
      expect(res.accountEmail).toBe('parent@ex.fr');
      expect(res.members).toHaveLength(3);
    });

    it('accepte un ancien numéro de licence saisi sans ses zéros de tête', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: currentId, licence: '00712345', lastName: 'Ancien', firstName: 'Guy',
        email: 'guy@ex.fr', type: 'adulte', birthDate: '1960-01-01'
      });

      for (const typed of ['712345', '0712345', '00712345', '00 712 345']) {
        const res = await lookup(typed);
        expect(res.status, typed).toBe('granted');
        expect(res.accountEmail, typed).toBe('guy@ex.fr');
      }
    });

    it('isole un adhérent non rattaché', async () => {
      const res = await lookup('autre@ex.fr');
      expect(res.members.map((m) => m.licence)).toEqual(['2000001']);
    });

    it('ignore le drapeau comptable `active` et s’en tient aux dates', async () => {
      // 26-27 porte `active: true` dans le harnais : si le lookup le suivait, le foyer
      // serait déclaré non licencié alors qu'il joue la saison en cours.
      const res = await lookup('parent@ex.fr');
      expect(res.seasonCode).toBe('25-26');
    });

    it('retient la saison en cours quand le foyer est aussi inscrit pour la suivante', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: nextId, licence: '1000003', lastName: 'Martin', firstName: 'Papa',
        email: 'parent@ex.fr', type: 'adulte', birthDate: '1980-01-01'
      });

      const res = await lookup('parent@ex.fr');
      expect(res.status).toBe('granted');
      expect(res.seasonCode).toBe('25-26');
      // Un seul dossier « Papa » : jamais de mélange de deux saisons dans la session.
      expect(res.members.filter((m) => m.firstName === 'Papa')).toHaveLength(1);
    });
  });

  describe('foyer mixte — une partie réadhère, l’autre non', () => {
    // Un enfant réinscrit, l'autre pas : le cas se présentera à chaque rentrée, dès qu'une
    // famille échelonne ses licences.
    beforeEach(async () => {
      await insertMemberFixtures(db, [
        { ...baseMember, seasonId: currentId, licence: '6000001', lastName: 'Mixte', firstName: 'Réinscrit', email: null, parent1Email: 'mixte@ex.fr' },
        { ...baseMember, seasonId: previousId, licence: '6000002', lastName: 'Mixte', firstName: 'Pas réinscrit', email: null, parent1Email: 'mixte@ex.fr' }
      ]);
    });

    it('ouvre l’accès au foyer dès qu’UN membre est licencié', async () => {
      const res = await lookup('mixte@ex.fr');
      expect(res.status).toBe('granted');
    });

    it('n’expose que les profils de la saison en cours', async () => {
      const res = await lookup('mixte@ex.fr');
      expect(res.members.map((m) => m.firstName)).toEqual(['Réinscrit']);
    });

    it('signale nommément le membre non réinscrit', async () => {
      // Aucun email ne part pour ce foyer (il a un accès valide) : cette liste est le seul
      // moyen de prévenir le parent, via le bandeau de Mon compte.
      const res = await lookup('mixte@ex.fr');
      expect(res.lapsedMembers.map((m) => m.firstName)).toEqual(['Pas réinscrit']);
    });

    it('ne signale personne quand tout le foyer a réadhéré', async () => {
      const res = await lookup('parent@ex.fr');
      expect(res.status).toBe('granted');
      expect(res.lapsedMembers).toEqual([]);
    });

    it('ouvre aussi l’accès depuis la licence du membre NON réinscrit', async () => {
      // Le parent peut saisir l'un ou l'autre numéro : les deux mènent au même foyer, et
      // c'est l'état du foyer — pas celui de la licence saisie — qui décide.
      const res = await lookup('6000002');
      expect(res.status).toBe('granted');
      expect(res.members.map((m) => m.firstName)).toEqual(['Réinscrit']);
    });
  });

  describe('licence en cours mais aucun règlement → `unpaid`', () => {
    it("n'ouvre pas la session tant qu'aucun versement n'est enregistré dans le foyer", async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: currentId, licence: '5000001', lastName: 'Attend', firstName: 'Paul',
        email: 'paul@ex.fr', type: 'adulte', birthDate: '1990-01-01', status: 'en_attente'
      });

      const res = await lookup('paul@ex.fr');
      expect(res.status).toBe('unpaid');
      expect(res.members).toEqual([]);
      // On connaît l'email : c'est par lui qu'on explique l'attente.
      expect(res.accountEmail).toBe('paul@ex.fr');
      expect(res.seasonName).toBe('Saison 25-26');
    });

    it('un dossier annulé ne compte pas comme un versement', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: currentId, licence: '5000002', lastName: 'Annulé', firstName: 'Max',
        email: 'max@ex.fr', type: 'adulte', birthDate: '1990-01-01', status: 'suspendu', paid: true
      });

      expect((await lookup('max@ex.fr')).status).toBe('unpaid');
    });

    it('un versement partiel suffit à ouvrir le foyer entier, dossiers en attente compris', async () => {
      await insertMemberFixtures(db, [
        { ...baseMember, seasonId: currentId, licence: '5000003', lastName: 'Foyer', firstName: 'Acompte', email: null, parent1Email: 'foyer@ex.fr', status: 'incomplet' },
        { ...baseMember, seasonId: currentId, licence: '5000004', lastName: 'Foyer', firstName: 'Attente', email: null, parent1Email: 'foyer@ex.fr', status: 'en_attente' }
      ]);

      const res = await lookup('foyer@ex.fr');
      expect(res.status).toBe('granted');
      expect(res.members.map((m) => m.firstName).sort()).toEqual(['Acompte', 'Attente']);
      // Le statut reste au domaine : la session n'en a pas l'usage.
      expect(Object.keys(res.members[0])).not.toContain('status');
    });
  });

  describe('sans licence en cours', () => {
    it('inscription anticipée : `upcoming`, sans aucun dossier en session', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: nextId, licence: '3000001', lastName: 'Nouveau', firstName: 'Alex',
        email: 'alex@ex.fr', type: 'adulte', birthDate: '1990-01-01'
      });

      const res = await lookup('alex@ex.fr');
      expect(res.status).toBe('upcoming');
      expect(res.members).toEqual([]);
      expect(res.accountEmail).toBe('alex@ex.fr');
      expect(res.seasonName).toBe('Saison 26-27');
      expect(res.accessOpensOn).toBe('2026-09-01');
    });

    it('licence non renouvelée : `lapsed`, sans aucun dossier en session', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: previousId, licence: '4000001', lastName: 'Parti', firstName: 'Sam',
        email: 'sam@ex.fr', type: 'adulte', birthDate: '1990-01-01'
      });

      const res = await lookup('sam@ex.fr');
      expect(res.status).toBe('lapsed');
      expect(res.members).toEqual([]);
      expect(res.accountEmail).toBe('sam@ex.fr');
      // Le bandeau ne concerne que les foyers entrés : ici c'est l'email qui prend le relais.
      expect(res.lapsedMembers).toEqual([]);
      // L'email parle de la saison qui lui manque, pas de celle qu'il a quittée.
      expect(res.seasonName).toBe('Saison 25-26');
    });

    it('retrouve l’ex-adhérent par son numéro de licence, pas seulement par email', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: previousId, licence: '4000001', lastName: 'Parti', firstName: 'Sam',
        email: 'sam@ex.fr', type: 'adulte', birthDate: '1990-01-01'
      });

      const res = await lookup('4000001');
      expect(res.status).toBe('lapsed');
      expect(res.accountEmail).toBe('sam@ex.fr');
    });

    it('parti depuis deux saisons : indiscernable d’un inconnu', async () => {
      await insertMemberFixture(db, {
        ...baseMember, seasonId: oldestId, licence: '5000001', lastName: 'Ancien', firstName: 'Max',
        email: 'max@ex.fr', type: 'adulte', birthDate: '1990-01-01'
      });

      const res = await lookup('max@ex.fr');
      expect(res.status).toBe('unknown');
      expect(res.members).toEqual([]);
    });

    it('email inconnu', async () => {
      const res = await lookup('inconnu@ex.fr');
      expect(res.status).toBe('unknown');
      expect(res.members).toHaveLength(0);
    });

    it('licence inconnue', async () => {
      const res = await lookup('9999999');
      expect(res.status).toBe('unknown');
      expect(res.accountEmail).toBeNull();
      expect(res.members).toHaveLength(0);
    });
  });

  describe('calendrier incomplet', () => {
    it('ne coupe personne si aucune saison ne couvre la date du jour', async () => {
      // Octobre 2027 : la saison 27-28 n'a pas encore été créée en base. On retombe sur la
      // dernière saison commencée (26-27) plutôt que de verrouiller tout le club — un
      // oubli du bureau ne doit pas se traduire par une panne d'accès générale.
      await insertMemberFixture(db, {
        ...baseMember, seasonId: nextId, licence: '1000003', lastName: 'Martin', firstName: 'Papa',
        email: 'parent@ex.fr', type: 'adulte', birthDate: '1980-01-01'
      });

      const res = await repo.lookup(db, 'parent@ex.fr', '2027-10-01');
      expect(res.status).toBe('granted');
      expect(res.seasonCode).toBe('26-27');
    });
  });

  describe('licenceCandidates', () => {
    it('complète à huit chiffres sans perdre la saisie d’origine', () => {
      expect(licenceCandidates('712345')).toEqual(['712345', '00712345']);
      expect(licenceCandidates('07104079')).toEqual(['07104079']);
      expect(licenceCandidates('07 104 079')).toEqual(['07104079']);
    });

    it('ne complète pas ce qui n’est pas un numéro', () => {
      expect(licenceCandidates('ABC123')).toEqual(['ABC123']);
      expect(licenceCandidates('123456789')).toEqual(['123456789']);
    });
  });
});
