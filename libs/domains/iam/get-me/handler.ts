import { type Db } from '@nba/db';
import { getActor } from '../get-actor/handler';
import { normalizeEmail, type Actor } from '../get-actor/dto';
import { BootstrapRepository } from './repository';

export interface GetMeResult {
  /** `null` si l'adresse n'a aucun compte : l'app admin affiche « compte non configuré ». */
  actor: Actor | null;
  /** Vrai si ce compte vient d'être créé comme tout premier administrateur. */
  bootstrapped: boolean;
}

/**
 * Résout le compte appelant, en créant le tout premier administrateur si la base
 * n'en contient aucun.
 *
 * Le bootstrap vit ici plutôt que dans le middleware de l'application admin : c'est
 * une écriture, elle doit donc être décidée par le détenteur de la base, et une
 * seule fois pour tous les appelants.
 */
export async function getMe(db: Db, email: string, now: Date = new Date()): Promise<GetMeResult> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { actor: null, bootstrapped: false };

  const existing = await getActor(db, normalized);
  if (existing) return { actor: existing, bootstrapped: false };

  const repo = new BootstrapRepository();
  const createdId = await repo.createFirstAdmin(db, normalized, normalized.split('@')[0], now);
  if (createdId === null) {
    // La table n'était pas vide : cette adresse n'est simplement pas autorisée.
    return { actor: null, bootstrapped: false };
  }

  return { actor: await getActor(db, normalized), bootstrapped: true };
}
