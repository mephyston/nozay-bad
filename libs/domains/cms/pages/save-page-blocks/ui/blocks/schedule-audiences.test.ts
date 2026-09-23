import { describe, it, expect } from 'vitest';
import { AUDIENCE_LABELS } from '../../../../../schedules/shared/schema';
import { PUBLICS_DE_CRENEAU } from './schedule-audiences';

describe('les publics du bloc créneaux', () => {
  it('coïncident avec ceux du domaine créneaux, valeurs et libellés', () => {
    /*
      Un public ajouté aux créneaux ne serait jamais proposé ici ; un public retiré
      resterait offert, et le bloc filtrerait sur une valeur que plus aucun créneau ne
      porte — en n'affichant rien, sans rien dire.
    */
    expect(PUBLICS_DE_CRENEAU).toEqual(
      Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))
    );
  });
});
