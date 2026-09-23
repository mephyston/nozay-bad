import { describe, it, expect, vi } from 'vitest';
import {
  candidaturesDeSoiree,
  detailDeSoiree,
  gestesDeSoiree,
  moisDeSoiree,
  pastilleDeSoiree,
  placesDeSoiree,
  remplissageDeSoiree,
  resteAAnnoncer,
  titreDeSoiree,
  tonDeRemplissage,
  type SoireeLike
} from './indiv-row-model';

const AUJOURDHUI = '2026-08-30';

const soiree = (patch: Partial<SoireeLike> = {}): SoireeLike => ({
  id: 1,
  date: '2026-09-15',
  startTime: '19:30',
  endTime: '22:30',
  venue: { name: 'Halle des Sports' },
  slotCount: 3,
  capacityPerSlot: 4,
  status: 'open',
  label: null,
  requestCount: 9,
  selectedCount: 6,
  ...patch
});

describe('projection d’une soirée', () => {
  it('écrit le jour, et l’intitulé quand il y en a un', () => {
    expect(titreDeSoiree(soiree())).toContain('15');
    expect(titreDeSoiree(soiree({ label: 'Indiv jeunes' }))).toContain('Indiv jeunes');
    expect(titreDeSoiree(soiree({ label: '  ' }))).not.toContain('·');
  });

  it('donne l’horaire et le gymnase sous le titre', () => {
    expect(detailDeSoiree(soiree())).toBe('19:30–22:30 · Halle des Sports');
    expect(detailDeSoiree(soiree({ venue: null }))).toContain('Gymnase inconnu');
  });

  it('compte les places comme créneaux × places par créneau', () => {
    expect(placesDeSoiree(soiree({ slotCount: 3, capacityPerSlot: 4 }))).toBe(12);
    expect(remplissageDeSoiree(soiree({ selectedCount: 6 }))).toBe('6/12');
  });

  it('met l’affluence sous le remplissage, accordée', () => {
    expect(candidaturesDeSoiree(soiree({ requestCount: 0 }))).toBe('0 candidat');
    expect(candidaturesDeSoiree(soiree({ requestCount: 1 }))).toBe('1 candidat');
    expect(candidaturesDeSoiree(soiree({ requestCount: 9 }))).toBe('9 candidats');
  });

  it('passe au vert quand toutes les places sont pourvues', () => {
    expect(tonDeRemplissage(soiree({ selectedCount: 12 }))).toBe('success');
    expect(tonDeRemplissage(soiree({ selectedCount: 11 }))).toBe('muted');
  });

  it('ne se prononce plus sur une soirée annulée', () => {
    expect(tonDeRemplissage(soiree({ selectedCount: 12, status: 'cancelled' }))).toBe('muted');
  });

  it('groupe sur le mois', () => {
    expect(moisDeSoiree(soiree({ date: '2026-09-15' }))).toBe('2026-09');
  });
});

describe('ce qui reste à annoncer', () => {
  it('est une soirée ouverte, encore à venir', () => {
    expect(resteAAnnoncer(soiree({ date: '2026-09-15' }), AUJOURDHUI)).toBe(true);
    expect(resteAAnnoncer(soiree({ date: AUJOURDHUI }), AUJOURDHUI)).toBe(true);
  });

  it('n’est ni le passé, ni l’annoncé, ni l’annulé', () => {
    expect(resteAAnnoncer(soiree({ date: '2026-08-01' }), AUJOURDHUI)).toBe(false);
    expect(resteAAnnoncer(soiree({ status: 'announced' }), AUJOURDHUI)).toBe(false);
    expect(resteAAnnoncer(soiree({ status: 'cancelled' }), AUJOURDHUI)).toBe(false);
  });
});

describe('pastille', () => {
  it('ne badge ni l’annoncé ni le passé', () => {
    /*
      Le tableau badgeait les quatre états, donc chaque rangée, donc plus rien. Une
      soirée annoncée ou passée n'appelle aucun geste : son silence est l'information.
    */
    expect(pastilleDeSoiree(soiree({ status: 'announced' }), AUJOURDHUI)).toBeUndefined();
    expect(pastilleDeSoiree(soiree({ date: '2026-08-01' }), AUJOURDHUI)).toBeUndefined();
  });

  it('signale l’annulation et ce qui attend son annonce', () => {
    expect(pastilleDeSoiree(soiree({ status: 'cancelled' }), AUJOURDHUI)?.texte).toBe('Annulée');
    expect(pastilleDeSoiree(soiree(), AUJOURDHUI)?.texte).toBe('À annoncer');
  });

  it('dit l’annulation avant tout le reste', () => {
    expect(
      pastilleDeSoiree(soiree({ status: 'cancelled', date: '2026-12-01' }), AUJOURDHUI)?.texte
    ).toBe('Annulée');
  });
});

describe('gestes', () => {
  const gestes = () => ({ onEdit: vi.fn(), onCancel: vi.fn(), onReopen: vi.fn() });

  it('n’offre rien sans droit d’écriture', () => {
    expect(gestesDeSoiree(soiree(), {}, gestes())).toEqual([]);
  });

  it('met la modification en tête, puisqu’un balayage long l’exécute', () => {
    const liste = gestesDeSoiree(soiree(), { canWrite: true }, gestes());
    expect(liste[0].id).toBe('modifier');
  });

  it('n’offre pas les candidats au balayage : l’appui y mène', () => {
    // Les candidats vivent sur une autre page. Un chevron promet un ailleurs ;
    // l'offrir aussi au balayage coûterait une rangée pour ne rien ajouter.
    const liste = gestesDeSoiree(soiree(), { canWrite: true }, gestes());
    expect(liste.map((a) => a.id)).toEqual(['modifier', 'sort']);
  });

  it('remplace annuler par rouvrir sur une soirée annulée', () => {
    const g = gestes();
    const liste = gestesDeSoiree(soiree({ status: 'cancelled' }), { canWrite: true }, g);
    const sort = liste.find((a) => a.id === 'sort')!;
    expect(sort.label).toBe('Rouvrir');
    sort.run(soiree({ status: 'cancelled' }));
    expect(g.onReopen).toHaveBeenCalled();
    expect(g.onCancel).not.toHaveBeenCalled();
  });

  it('ne pose aucune question de son cru', () => {
    const liste = gestesDeSoiree(soiree(), { canWrite: true }, gestes());
    expect(liste.every((a) => a.confirm === undefined)).toBe(true);
  });
});
