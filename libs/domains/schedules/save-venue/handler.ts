import { type Db } from '@nba/db';
import { SaveVenueRepository } from './repository';
import type { SaveVenueInput, SaveVenueOutput } from './dto';

/**
 * Crée ou met à jour un gymnase, identifié par son code.
 *
 * Idempotent : rejouer une reprise de données ne crée pas de doublon, et le club en
 * compte deux — il n'y a pas de raison d'exposer une création et une modification
 * séparées pour cela.
 */
export async function saveVenue(
  db: Db, input: SaveVenueInput, now: Date = new Date()
): Promise<SaveVenueOutput> {
  const repo = new SaveVenueRepository();
  const values = {
    name: input.name,
    streetAddress: input.streetAddress ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null
  };

  const existing = await repo.findByCode(db, input.code);
  if (existing) return repo.update(db, existing.id, values);
  return repo.insert(db, { code: input.code, ...values, createdAt: now });
}
