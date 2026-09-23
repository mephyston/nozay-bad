import { describe, it, expect } from 'vitest';
import { EVENT_CATEGORY_LABELS } from '../../../../../events/shared/schema';
import { CATEGORIES_DAGENDA } from './events-categories';

/**
 * Le bloc agenda recopie les catégories du domaine `events` plutôt que d'en dépendre :
 * le CMS ne dépend d'aucun autre domaine, et importer l'agenda pour six libellés
 * créerait ce couplage pour rien.
 *
 * Le prix de ce choix est la divergence silencieuse — une catégorie ajoutée à l'agenda
 * ne serait jamais proposée ici, et une catégorie retirée resterait offerte en filtrant
 * sur une valeur que plus rien ne porte. Ce test est ce qui rend le choix tenable.
 */
describe('les catégories du bloc agenda', () => {
  it('coïncident avec celles du domaine agenda, valeurs et libellés', () => {
    expect(CATEGORIES_DAGENDA).toEqual(
      Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
    );
  });
});
