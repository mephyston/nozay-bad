import { type Db } from '@nba/db';
import { CreateAccountClassRepository } from './repository';
import { CreateAccountClassInput, CreateAccountClassOutput } from "./dto";

/**
 * Le code d'une classe est un texte — « 511 », « 60 » — et le reste jusqu'en base.
 *
 * Il était converti en nombre avant l'insertion : D1 le liait en REAL, et la colonne
 * texte gardait « 511.0 ». Le relais refusant ensuite ce code (un point n'y est pas
 * admis), la classe ne pouvait plus ni se modifier ni se supprimer.
 */
export async function createAccountClass(db: Db, body: CreateAccountClassInput): Promise<CreateAccountClassOutput> {
  const repo = new CreateAccountClassRepository();
  return repo.createAccountClass(db, {
    code: String(body.code).trim(),
    label: body.label.trim(),
    type: (body.type || 'recette') as any,
    createdAt: new Date()
  });
}
