import { describe, it, expect, vi } from 'vitest';
import {
  detailDeSeance,
  gestePrincipal,
  gestesAuBalayage,
  gestesPourSeance,
  composantesDeDate,
  jourDeSeance,
  libelleDeMois,
  moisDeSeance,
  ouvreurDeSeance,
  pastilleDeSeance,
  remplissageDeSeance,
  titreDeSeance,
  tonDeRemplissage,
  type SeanceLike
} from './open-play-row-model';

const seance = (patch: Partial<SeanceLike> = {}): SeanceLike => ({
  id: 1,
  date: '2026-10-11',
  startTime: '14:00',
  endTime: '17:00',
  venue: { name: 'Halle des Sports' },
  minPlayers: 6,
  status: 'open',
  openerFirstName: null,
  openerLastName: null,
  label: null,
  playerCount: 4,
  needsOpener: false,
  ...patch
});

describe('projection d’une séance', () => {
  it('écrit le jour en français', () => {
    expect(jourDeSeance('2026-10-11')).toContain('11');
    expect(jourDeSeance('2026-10-11')).toContain('oct');
  });

  it('lit la date par ses composantes, jamais par new Date(chaîne)', () => {
    /*
      `new Date('2026-10-11')` se lit en UTC : à l'ouest de Greenwich, minuit UTC tombe
      la veille et la séance s'affiche un jour trop tôt.

      Ce test ne peut pas attraper cette variante — sur un runner en UTC comme à Paris,
      les deux lectures donnent le même jour, et forcer `process.env.TZ` ici ne sert à
      rien : Node fige le fuseau au premier `Date` du processus, bien avant ce fichier.
      Ce qui se teste, c'est l'extraction elle-même, sur laquelle la construction
      locale repose.
    */
    expect(composantesDeDate('2026-10-11')).toEqual({ annee: 2026, mois: 10, jour: 11 });
    expect(composantesDeDate('2026-10-11 ')).toEqual({ annee: 2026, mois: 10, jour: 11 });
    expect(composantesDeDate('11/10/2026')).toBeNull();
    expect(composantesDeDate('2026-10')).toBeNull();
    expect(composantesDeDate('')).toBeNull();
  });

  it('rend la date telle quelle quand elle n’en est pas une', () => {
    expect(jourDeSeance('pas une date')).toBe('pas une date');
  });

  it('porte l’intitulé dans le titre, quand il y en a un', () => {
    expect(titreDeSeance(seance())).not.toContain('·');
    expect(titreDeSeance(seance({ label: 'Jeu libre des vacances' }))).toContain(
      'Jeu libre des vacances'
    );
  });

  it('ignore un intitulé fait d’espaces', () => {
    expect(titreDeSeance(seance({ label: '   ' }))).not.toContain('·');
  });

  it('donne l’horaire et le gymnase sous le titre', () => {
    expect(detailDeSeance(seance())).toBe('14:00–17:00 · Halle des Sports');
  });

  it('nomme le gymnase manquant plutôt que d’afficher un tiret', () => {
    // Un `—` laissait croire à une séance sans lieu ; c'est une donnée perdue.
    expect(detailDeSeance(seance({ venue: null }))).toContain('Gymnase inconnu');
  });

  it('affiche le remplissage sur le seuil', () => {
    expect(remplissageDeSeance(seance({ playerCount: 8, minPlayers: 6 }))).toBe('8/6');
  });
});

describe('ton du remplissage', () => {
  it('passe au vert dès que le seuil est atteint', () => {
    expect(tonDeRemplissage(seance({ playerCount: 6, minPlayers: 6 }))).toBe('success');
    expect(tonDeRemplissage(seance({ playerCount: 5, minPlayers: 6 }))).toBe('muted');
  });

  it('ne se prononce plus sur une séance annulée', () => {
    expect(tonDeRemplissage(seance({ playerCount: 12, status: 'cancelled' }))).toBe('muted');
  });
});

describe('ouvreur', () => {
  it('abrège le nom', () => {
    expect(ouvreurDeSeance(seance({ openerFirstName: 'Robert', openerLastName: 'Dupont' }))).toBe(
      'Robert D.'
    );
  });

  it('se contente du prénom quand le nom manque', () => {
    expect(ouvreurDeSeance(seance({ openerFirstName: 'Robert', openerLastName: '' }))).toBe(
      'Robert'
    );
  });

  it('n’existe pas quand personne ne s’est proposé', () => {
    expect(ouvreurDeSeance(seance())).toBeUndefined();
  });
});

describe('pastille', () => {
  it('ne badge pas le cas courant', () => {
    /*
      Le tableau badgeait les quatre états. Sur une ligne de téléphone, une pastille à
      chaque rangée ne distingue plus rien et rogne le titre.
    */
    expect(pastilleDeSeance(seance())).toBeUndefined();
    expect(
      pastilleDeSeance(seance({ openerFirstName: 'Robert', openerLastName: 'Dupont' }))
    ).toBeUndefined();
  });

  it('signale l’annulation et le manque d’ouvreur', () => {
    expect(pastilleDeSeance(seance({ status: 'cancelled' }))?.texte).toBe('Annulée');
    expect(pastilleDeSeance(seance({ needsOpener: true }))?.texte).toBe('À pourvoir');
  });

  it('dit l’annulation avant le manque d’ouvreur', () => {
    // Une séance annulée n'a plus besoin d'ouvreur : le dire serait un appel à l'aide
    // pour une séance qui n'aura pas lieu.
    expect(pastilleDeSeance(seance({ status: 'cancelled', needsOpener: true }))?.texte).toBe(
      'Annulée'
    );
  });
});

describe('regroupement par mois', () => {
  it('groupe sur le mois et l’écrit en toutes lettres', () => {
    expect(moisDeSeance(seance({ date: '2026-10-11' }))).toBe('2026-10');
    expect(libelleDeMois('2026-10')).toContain('octobre');
    expect(libelleDeMois('2026-10')).toContain('2026');
  });

  it('rend la clé telle quelle quand elle n’est pas un mois', () => {
    expect(libelleDeMois('bricole')).toBe('bricole');
  });
});

describe('gestes', () => {
  const gestes = () => ({
    onRegistrations: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onReopen: vi.fn()
  });

  it('met en tête l’action réversible', () => {
    /*
      La première action déclarée est celle qu'un balayage long exécute. Y mettre
      l'annulation ferait annuler une séance d'un geste, sans question.
    */
    const liste = gestesPourSeance(
      seance(),
      { canWrite: true, canReadRegistrations: true },
      gestes()
    );
    expect(liste[0].id).toBe('inscrits');
  });

  it('n’offre que la lecture sans droit d’écriture', () => {
    const liste = gestesPourSeance(seance(), { canReadRegistrations: true }, gestes());
    expect(liste.map((a) => a.id)).toEqual(['inscrits']);
  });

  it('n’offre rien du tout sans aucun droit', () => {
    expect(gestesPourSeance(seance(), {}, gestes())).toEqual([]);
  });

  it('remplace annuler par rouvrir sur une séance annulée', () => {
    const g = gestes();
    const liste = gestesPourSeance(seance({ status: 'cancelled' }), { canWrite: true }, g);
    const sort = liste.find((a) => a.id === 'sort');
    expect(sort?.label).toBe('Rouvrir');
    sort?.run(seance({ status: 'cancelled' }));
    expect(g.onReopen).toHaveBeenCalled();
    expect(g.onCancel).not.toHaveBeenCalled();
  });

  it('ne pose aucune question dans le geste lui-même', () => {
    /*
      L'écran en pose déjà une, et la sienne est plus précise : l'annulation réclame un
      motif que l'adhérent inscrit lira, la réouverture dit ce qu'elle fait aux
      inscriptions. Une question générique par-dessus ferait deux questions.
    */
    const liste = gestesPourSeance(
      seance(),
      { canWrite: true, canReadRegistrations: true },
      gestes()
    );
    expect(liste.every((a) => a.confirm === undefined)).toBe(true);
  });

  it('retire du balayage ce que l’appui fait déjà', () => {
    /*
      Le chevron promet un détail, et sur une séance ce détail est « qui vient ».
      Laisser « Voir les inscrits » au balayage coûterait une rangée pour rien, et
      ferait douter de ce que l'appui déclenche.
    */
    const droits = { canWrite: true, canReadRegistrations: true };
    expect(gestePrincipal(droits)).toBe('inscrits');
    expect(gestesAuBalayage(seance(), droits, gestes()).map((a) => a.id)).toEqual([
      'modifier',
      'sort'
    ]);
  });

  it('bascule l’appui sur la modification quand les inscrits sont hors de portée', () => {
    const droits = { canWrite: true };
    expect(gestePrincipal(droits)).toBe('modifier');
    expect(gestesAuBalayage(seance(), droits, gestes()).map((a) => a.id)).toEqual(['sort']);
  });

  it('ne rend pas la ligne tappable sans aucun droit', () => {
    expect(gestePrincipal({})).toBeNull();
    expect(gestesAuBalayage(seance(), {}, gestes())).toEqual([]);
  });
});
