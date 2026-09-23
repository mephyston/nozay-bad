import { describe, it, expect, vi } from 'vitest';
import {
  detailDeReglement,
  gestesDeReglement,
  pastilleDeReglement,
  reglementDepose,
  type ReglementLike
} from './championship-rules-row-model';

const reglement = (patch: Partial<ReglementLike> = {}): ReglementLike => ({
  championship: 'departemental_mixte',
  label: 'Interclubs Départemental Mixte',
  rulesUrl: 'https://exemple.fr/media/reglement-2026.pdf',
  rulesLabel: null,
  ...patch
});

describe('état d’un règlement', () => {
  it('reconnaît un lien déposé', () => {
    expect(reglementDepose(reglement())).toBe(true);
    expect(reglementDepose(reglement({ rulesUrl: null }))).toBe(false);
  });

  it('traite une adresse faite d’espaces comme une absence', () => {
    expect(reglementDepose(reglement({ rulesUrl: '   ' }))).toBe(false);
  });
});

describe('ce qui se lit sous le championnat', () => {
  it('préfère le libellé déposé', () => {
    expect(detailDeReglement(reglement({ rulesLabel: 'Règlement 2026-2027' }))).toBe(
      'Règlement 2026-2027'
    );
  });

  it('se rabat sur le domaine du lien', () => {
    // L'adresse entière déborderait de la ligne ; le domaine dit d'où ça vient.
    expect(detailDeReglement(reglement())).toBe('exemple.fr');
  });

  it('montre une adresse illisible plutôt que de la taire', () => {
    // Une adresse que le navigateur refuse de lire est une adresse à corriger.
    expect(detailDeReglement(reglement({ rulesUrl: 'pas-une-adresse' }))).toBe('pas-une-adresse');
  });

  it('dit l’absence', () => {
    expect(detailDeReglement(reglement({ rulesUrl: null }))).toBe('Aucun lien déposé');
  });
});

describe('pastille', () => {
  it('ne badge pas un championnat pourvu', () => {
    expect(pastilleDeReglement(reglement())).toBeUndefined();
  });

  it('signale le manque', () => {
    // C'est le texte qui fait foi le soir de la rencontre.
    expect(pastilleDeReglement(reglement({ rulesUrl: null }))?.label).toBe('Sans règlement');
  });
});

describe('gestes', () => {
  const gestes = () => ({ onEdit: vi.fn(), onOpen: vi.fn() });

  it('n’offre pas d’ouvrir ce qui n’existe pas', () => {
    expect(
      gestesDeReglement(reglement({ rulesUrl: null }), { canWrite: true }, gestes()).map((a) => a.id)
    ).toEqual(['modifier']);
  });

  it('met l’ouverture en tête quand il y a un lien', () => {
    // Une adresse fausse ne se voit pas autrement qu'en la suivant — et c'est le geste
    // réversible, or un balayage long exécute la première action déclarée.
    expect(gestesDeReglement(reglement(), { canWrite: true }, gestes()).map((a) => a.id)).toEqual([
      'ouvrir',
      'modifier'
    ]);
  });

  it('n’offre aucune écriture en lecture seule', () => {
    expect(gestesDeReglement(reglement(), {}, gestes()).map((a) => a.id)).toEqual(['ouvrir']);
    expect(gestesDeReglement(reglement({ rulesUrl: null }), {}, gestes())).toEqual([]);
  });
});
