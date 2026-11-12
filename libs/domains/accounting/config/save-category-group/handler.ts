import { AppError, type Db } from '@nba/db';
import { SaveCategoryGroupRepository } from './repository';
import type { CreateCategoryGroupInput, UpdateCategoryGroupInput } from './dto';

const NOMS = { pole: 'pôle', rubrique: 'rubrique' } as const;

/** Un pôle ou une rubrique de plus. Le libellé est unique dans sa famille. */
export async function createCategoryGroup(db: Db, input: CreateCategoryGroupInput, now: Date = new Date()) {
  const repo = new SaveCategoryGroupRepository();
  const label = input.label.trim();
  if (!label) throw new AppError('Le libellé est obligatoire.', 400);
  if (await repo.findByLabel(db, input.kind, label)) {
    throw new AppError(`Un ${NOMS[input.kind]} « ${label} » existe déjà.`, 409);
  }
  // Les cotisations sont une rubrique : un pôle ne porte jamais ce drapeau.
  const membershipFees = input.kind === 'rubrique' && !!input.membershipFees;
  return repo.insert(db, {
    kind: input.kind,
    label,
    position: input.position ?? (await repo.nextPosition(db, input.kind)),
    membershipFees,
    createdAt: now
  });
}

export async function updateCategoryGroup(db: Db, id: number, input: UpdateCategoryGroupInput) {
  const repo = new SaveCategoryGroupRepository();
  const current = await repo.findById(db, id);
  if (!current) throw new AppError('Regroupement introuvable.', 404);

  const values: { label?: string; position?: number; membershipFees?: boolean } = {};
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) throw new AppError('Le libellé est obligatoire.', 400);
    const taken = await repo.findByLabel(db, current.kind, label);
    if (taken && taken.id !== id) throw new AppError(`Un ${NOMS[current.kind]} « ${label} » existe déjà.`, 409);
    values.label = label;
  }
  if (input.position !== undefined) values.position = input.position;
  if (input.membershipFees !== undefined) {
    if (current.kind !== 'rubrique' && input.membershipFees) {
      throw new AppError('Seule une rubrique peut désigner les cotisations.', 400);
    }
    values.membershipFees = input.membershipFees;
  }
  if (Object.keys(values).length === 0) return current;
  return repo.update(db, id, values);
}
