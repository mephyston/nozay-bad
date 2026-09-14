/**
 * Les catégories d'âge de la FFBaD.
 *
 * La règle fédérale ne regarde que l'année de naissance : la catégorie d'une saison N/N+1
 * est celle de l'âge atteint au 31 décembre de l'année N. Un poussin né en 2016 le reste
 * toute la saison 2026-2027, même passé son anniversaire.
 *
 * L'export des classements Poona porte une catégorie plus fine (« Poussin 1 / Poussin 2 »)
 * mais ne couvre que les licences déjà validées à la date de l'export ; d'où ce calcul,
 * qui vaut pour toute adhésion dès qu'elle a une date de naissance.
 */
export interface AgeCategory {
  code: string;
  label: string;
  /** Borne basse de l'âge au 31 décembre ; `maxAge` incluse, absente pour la dernière. */
  minAge: number;
  maxAge?: number;
  youth: boolean;
}

export const AGE_CATEGORIES: readonly AgeCategory[] = [
  { code: 'U9', label: 'Minibad (U9)', minAge: 0, maxAge: 8, youth: true },
  { code: 'U11', label: 'Poussin (U11)', minAge: 9, maxAge: 10, youth: true },
  { code: 'U13', label: 'Benjamin (U13)', minAge: 11, maxAge: 12, youth: true },
  { code: 'U15', label: 'Minime (U15)', minAge: 13, maxAge: 14, youth: true },
  { code: 'U17', label: 'Cadet (U17)', minAge: 15, maxAge: 16, youth: true },
  { code: 'U19', label: 'Junior (U19)', minAge: 17, maxAge: 18, youth: true },
  { code: 'S', label: 'Senior', minAge: 19, maxAge: 34, youth: false },
  { code: 'V1', label: 'Vétéran V1', minAge: 35, maxAge: 39, youth: false },
  { code: 'V2', label: 'Vétéran V2', minAge: 40, maxAge: 44, youth: false },
  { code: 'V3', label: 'Vétéran V3', minAge: 45, maxAge: 49, youth: false },
  { code: 'V4', label: 'Vétéran V4', minAge: 50, maxAge: 54, youth: false },
  { code: 'V5', label: 'Vétéran V5', minAge: 55, maxAge: 59, youth: false },
  { code: 'V6', label: 'Vétéran V6', minAge: 60, maxAge: 64, youth: false },
  { code: 'V7', label: 'Vétéran V7', minAge: 65, maxAge: 69, youth: false },
  { code: 'V8', label: 'Vétéran V8', minAge: 70, youth: false }
];

/** L'année de référence d'une saison : celle de son début (`2026-09-01` → 2026, code `26-27` → 2026). */
export function seasonReferenceYear(season: { startDate?: string | null; code?: string | null }): number | null {
  const fromDate = season.startDate ? Number(season.startDate.slice(0, 4)) : NaN;
  if (Number.isInteger(fromDate) && fromDate > 1900) return fromDate;
  const m = /^(\d{2})-\d{2}$/.exec(season.code ?? '');
  return m ? 2000 + Number(m[1]) : null;
}

/** La catégorie d'une personne née en `birthYear`, pour la saison dont l'année de référence est `referenceYear`. */
export function ageCategoryOf(birthYear: number, referenceYear: number): AgeCategory {
  const age = referenceYear - birthYear;
  return AGE_CATEGORIES.find((c) => age >= c.minAge && (c.maxAge === undefined || age <= c.maxAge)) ?? AGE_CATEGORIES[0];
}

/** Les années de naissance couvertes par une catégorie, pour l'affichage (« 2016 – 2017 », « 2018 et après »). */
export function birthYearsOf(category: AgeCategory, referenceYear: number): string {
  const latest = referenceYear - category.minAge;
  if (category.maxAge === undefined) return `${latest} et avant`;
  const earliest = referenceYear - category.maxAge;
  return category.minAge === 0 ? `${earliest} et après` : `${earliest} – ${latest}`;
}

export interface AgePyramidRow {
  code: string;
  label: string;
  birthYears: string;
  youth: boolean;
  f: number;
  m: number;
  total: number;
}

/**
 * La pyramide des âges d'une saison, à partir d'un comptage par année de naissance et genre.
 * Toutes les catégories figurent, même vides : un tableau qui saute une ligne se lit mal.
 */
export function agePyramid(
  counts: { birthYear: number; gender: string; n: number }[],
  referenceYear: number
): AgePyramidRow[] {
  const rows = AGE_CATEGORIES.map((c) => ({ code: c.code, label: c.label, birthYears: birthYearsOf(c, referenceYear), youth: c.youth, f: 0, m: 0, total: 0 }));
  for (const { birthYear, gender, n } of counts) {
    const row = rows.find((r) => r.code === ageCategoryOf(birthYear, referenceYear).code)!;
    if (gender === 'F') row.f += n;
    else row.m += n;
    row.total += n;
  }
  return rows;
}
