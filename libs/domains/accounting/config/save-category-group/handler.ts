import { AppError, type Db } from '@nba/db';
import { SaveCategoryGroupRepository } from './repository';
import type { CreateCategoryGroupInput, UpdateCategoryGroupInput } from './dto';

const NOMS = { pole: 'pôle', rubrique: 'rubrique' } as const;

/**
 * Le libellé est unique dans sa famille : c'est l'index `category_groups_kind_label_idx`
 * qui le garantit, et son refus qu'on traduit. Aucune recherche par libellé en amont,
 * elle laisserait passer deux écritures simultanées.
 */
async function libelleUnique<T>(kind: keyof typeof NOMS, label: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    const message = String((err as { cause?: { message?: string } })?.cause?.message ?? (err as Error)?.message ?? err);
    if (/UNIQUE constraint failed/i.test(message)) throw new AppError(`Un ${NOMS[kind]} « ${label} » existe déjà.`, 409);
    throw err;
  }
}

/** Un pôle ou une rubrique de plus. Le libellé est unique dans sa famille. */
export async function createCategoryGroup(db: Db, input: CreateCategoryGroupInput, now: Date = new Date()) {
  const repo = new SaveCategoryGroupRepository();
  const label = input.label.trim();
  if (!label) throw new AppError('Le libellé est obligatoire.', 400);
  // Les cotisations sont une rubrique : un pôle ne porte jamais ce drapeau.
  const membershipFees = input.kind === 'rubrique' && !!input.membershipFees;
  const position = input.position ?? (await repo.nextPosition(db, input.kind));
  return libelleUnique(input.kind, label, () =>
    repo.insert(db, { kind: input.kind, label, position, membershipFees, createdAt: now })
  );
}

export async function updateCategoryGroup(db: Db, id: number, input: UpdateCategoryGroupInput) {
  const repo = new SaveCategoryGroupRepository();
  const current = await repo.findById(db, id);
  if (!current) throw new AppError('Regroupement introuvable.', 404);

  const values: { label?: string; position?: number; membershipFees?: boolean } = {};
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) throw new AppError('Le libellé est obligatoire.', 400);
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
  return libelleUnique(current.kind, values.label ?? current.label, () => repo.update(db, id, values));
}
