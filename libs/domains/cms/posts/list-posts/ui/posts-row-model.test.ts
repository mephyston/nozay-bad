import { describe, it, expect, vi } from 'vitest';
import {
  dateFr,
  estDiffusable,
  estEnLigne,
  gestesDActualite,
  ligneDActualite,
  pastillesDeTableau,
  signalementsDActualite,
  type ActualiteLike
} from './posts-row-model';

function actualite(surcharges: Partial<ActualiteLike> = {}): ActualiteLike {
  return {
    id: 1,
    title: 'Tournoi de rentrée',
    path: '/actualites/tournoi-de-rentree',
    status: 'draft',
    visibility: 'public',
    notifiedAt: null,
    publishedAt: null,
    ...surcharges
  };
}

const gestes = () => ({
  onEdit: vi.fn(),
  onTogglePublish: vi.fn(),
  onNotify: vi.fn(),
  onOpenSite: vi.fn(),
  onDelete: vi.fn()
});

const TOUS = { canWrite: true, canDelete: true, canNotify: true };

describe('posts-row-model', () => {
  it("projette le titre, l'adresse et la date, et éteint le brouillon", () => {
    const enLigne = ligneDActualite(
      actualite({ status: 'published', publishedAt: '2026-03-14T18:30:00' })
    );
    expect(enLigne.titre).toBe('Tournoi de rentrée');
    expect(enLigne.sousTitre).toBe('/actualites/tournoi-de-rentree');
    expect(enLigne.valeur).toBe('14/03/2026');
    expect(enLigne.ton).toBe('foreground');

    // Un brouillon n'a pas de date : un tiret, et le ton s'éteint.
    const brouillon = ligneDActualite(actualite());
    expect(brouillon.valeur).toBe('—');
    expect(brouillon.ton).toBe('muted');
  });

  it("lit les deux formats de date que l'écran reçoit", () => {
    // L'API répond en secondes, un formulaire en chaîne locale. Midi : aucun fuseau
    // ne peut faire basculer le jour.
    const secondes = Math.floor(new Date('2026-03-14T12:00:00').getTime() / 1000);
    expect(dateFr(secondes)).toBe('14/03/2026');
    expect(dateFr('2026-03-14T12:00:00')).toBe('14/03/2026');
    expect(dateFr(null)).toBe('—');
    expect(dateFr('pas une date')).toBe('—');
  });

  it("n'offre la diffusion qu'à une réservée, en ligne et jamais envoyée", () => {
    const enLigneReservee = actualite({ status: 'published', visibility: 'private' });
    expect(estDiffusable(enLigneReservee, true)).toBe(true);

    // Publique : elle paraît sur le site, on ne réveille personne pour ça.
    expect(estDiffusable(actualite({ status: 'published' }), true)).toBe(false);
    // Brouillon : il n'y a rien à annoncer.
    expect(estDiffusable(actualite({ visibility: 'private' }), true)).toBe(false);
    // Déjà envoyée : l'envoi ne se renouvelle pas.
    expect(estDiffusable({ ...enLigneReservee, notifiedAt: 1 }, true)).toBe(false);
    // Sans le droit.
    expect(estDiffusable(enLigneReservee, false)).toBe(false);
  });

  it("met l'étape du parcours en tête, et son intitulé suit l'état", () => {
    const brouillon = gestesDActualite(actualite(), TOUS, gestes());
    expect(brouillon[0].id).toBe('publier');
    expect(brouillon[0].label).toBe('Publier');
    expect(brouillon[0].tone).toBe('primary');

    const enLigne = gestesDActualite(actualite({ status: 'published' }), TOUS, gestes());
    expect(enLigne[0].label).toBe('Repasser en brouillon');
    expect(estEnLigne(actualite({ status: 'published' }))).toBe(true);
  });

  it("n'offre « Voir sur le site » qu'à une publique en ligne", () => {
    const ids = (row: ActualiteLike) => gestesDActualite(row, TOUS, gestes()).map((a) => a.id);
    expect(ids(actualite({ status: 'published' }))).toContain('site');
    expect(ids(actualite())).not.toContain('site');
    expect(ids(actualite({ status: 'published', visibility: 'private' }))).not.toContain('site');
  });

  it('ne double pas les questions que l’écran pose déjà', () => {
    /*
      Diffuser et supprimer demandent confirmation dans l'écran, avec un texte qui dit ce
      qu'une question générique ne dirait pas : qu'un envoi atteint tout le club et ne se
      rattrape pas, qu'une adresse supprimée cesse de répondre.
    */
    const actions = gestesDActualite(actualite({ status: 'published', visibility: 'private' }), TOUS, gestes());
    expect(actions.every((a) => a.confirm === undefined)).toBe(true);
  });

  it('ne signale que les écarts, et laisse le cas courant muet', () => {
    const labels = (row: ActualiteLike) => signalementsDActualite(row, true).map((p) => p.label);

    // Publique et publiée : le cas courant ne s'annonce pas, le titre garde sa place.
    expect(labels(actualite({ status: 'published' }))).toEqual([]);
    expect(labels(actualite())).toEqual(['Brouillon']);
    expect(labels(actualite({ visibility: 'private', status: 'published', notifiedAt: 1 }))).toEqual([
      'Adhérents'
    ]);
    // « À diffuser » remplace « Adhérents » : elle la suppose et en dit plus.
    expect(labels(actualite({ visibility: 'private', status: 'published' }))).toEqual(['À diffuser']);
  });

  it('ajoute le cas courant pour la colonne du tableau', () => {
    expect(pastillesDeTableau(actualite({ status: 'published' })).map((p) => p.label)).toEqual([
      'En ligne'
    ]);
    // Un brouillon ne gagne rien : il n'est pas en ligne.
    expect(pastillesDeTableau(actualite()).map((p) => p.label)).toEqual(['Brouillon']);
  });

  it('respecte les droits', () => {
    const g = gestes();
    expect(gestesDActualite(actualite(), {}, g)).toEqual([]);
    expect(gestesDActualite(actualite(), { canDelete: true }, g).map((a) => a.id)).toEqual(['supprimer']);
    expect(gestesDActualite(actualite(), { canWrite: true }, g).map((a) => a.id)).toEqual([
      'publier',
      'modifier'
    ]);
  });
});
