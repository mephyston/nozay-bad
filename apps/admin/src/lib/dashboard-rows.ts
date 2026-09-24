/**
 * Projections du tableau de bord en rangées de liste.
 *
 * Trois tableaux y défilaient en largeur sur un téléphone : la pyramide des âges
 * (catégorie, années de naissance, F, H, total) et les deux tableaux du renouvellement
 * par groupe. Un tableau à cinq colonnes ne tient pas dans 390 px, et rien ne défile
 * horizontalement dans cette application.
 *
 * Les totaux sont calculés ici plutôt que dans le gabarit : ce sont les chiffres que le
 * bureau recopie à l'assemblée générale, et un total faux dans un `{#each}` ne se
 * remarque pas.
 */
export type CategorieDAge = {
  code: string;
  label: string;
  birthYears: string;
  youth: boolean;
  f: number;
  m: number;
  total: number;
};

export type Effectif = { f: number; m: number; total: number };

export function sommeDe(rows: CategorieDAge[]): Effectif {
  return rows.reduce(
    (acc, r) => ({ f: acc.f + r.f, m: acc.m + r.m, total: acc.total + r.total }),
    { f: 0, m: 0, total: 0 }
  );
}

/** La part de féminines, en pourcentage entier. `null` quand il n'y a personne à compter. */
export function partDeFeminines(effectif: Effectif): number | null {
  return effectif.total > 0 ? Math.round((effectif.f / effectif.total) * 100) : null;
}

export type LigneDAge = {
  cle: string;
  titre: string;
  sousTitre: string;
  valeur: string;
  /** Une catégorie sans personne : affichée, mais en retrait. */
  vide: boolean;
  section: 'Jeunes' | 'Adultes';
};

/**
 * Une catégorie d'âge en rangée : son nom, sa répartition sous lui, son effectif à
 * droite. Les années de naissance suivent la répartition — c'est ce qui permet de
 * vérifier qu'on lit la bonne catégorie, et le tableau les montre déjà sur grand écran.
 */
export function ligneDAge(row: CategorieDAge): LigneDAge {
  return {
    cle: row.code,
    titre: row.label,
    sousTitre: `${row.f} F · ${row.m} H · nés en ${row.birthYears}`,
    valeur: String(row.total),
    vide: row.total === 0,
    section: row.youth ? 'Jeunes' : 'Adultes'
  };
}

/**
 * Les catégories peuplées, jeunes puis adultes.
 *
 * Les catégories vides sont écartées de la liste : le tableau les garde — il sert de
 * référence et doit montrer le cadre fédéral entier — mais sur un téléphone, dérouler
 * une dizaine de lignes à zéro entre deux chiffres utiles n'apprend rien.
 */
export function lignesDePyramide(ages: CategorieDAge[]): LigneDAge[] {
  return [
    ...ages.filter((r) => r.youth && r.total > 0),
    ...ages.filter((r) => !r.youth && r.total > 0)
  ].map(ligneDAge);
}

/** Un pourcentage lisible, ou un tiret : diviser par zéro ne dit rien. */
export function pourcentage(part: number, tout: number): string {
  return tout > 0 ? `${Math.round((part / tout) * 100)} %` : '—';
}

export type GroupeRenouvele = { group: string; total: number; renewed: number; newcomers: number };
export type GroupePerdu = { group: string; previousTotal: number; lapsed: number };

export type LigneDeGroupe = {
  cle: string;
  titre: string;
  sousTitre: string;
  valeur: string;
  /** Vrai quand la ligne mérite qu'on s'y arrête : une perte non nulle. */
  alerte: boolean;
};

/** D'où vient l'effectif d'un groupe : ce qui est revenu, ce qui est arrivé. */
export function ligneDeRenouvellement(r: GroupeRenouvele): LigneDeGroupe {
  return {
    cle: r.group,
    titre: r.group,
    sousTitre: `${r.renewed} renouvelé${r.renewed > 1 ? 's' : ''} · ${r.newcomers} nouveau${r.newcomers > 1 ? 'x' : ''}`,
    valeur: String(r.total),
    alerte: false
  };
}

/** Où l'on a perdu : le nombre de non-renouvelés, et ce qu'il pèse dans le groupe. */
export function ligneDePerte(r: GroupePerdu): LigneDeGroupe {
  return {
    cle: r.group,
    titre: r.group,
    sousTitre: `sur ${r.previousTotal} en n-1 · ${pourcentage(r.lapsed, r.previousTotal)} de perte`,
    valeur: String(r.lapsed),
    alerte: r.lapsed > 0
  };
}
