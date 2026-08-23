export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  status: string;
  type: string;
  paid: boolean;
  expenseAuthorized?: boolean;
  /**
   * Version du portrait, ou `null`/absent si l'adhérent n'en a pas.
   *
   * Traverse l'API en JSON, donc en chaîne ISO — mais la fiche, elle, le rend déjà en
   * millisecondes. Les deux formes sont admises plutôt qu'imposer une conversion au
   * bord : c'est la liste qui sait ce qu'elle en fait, et elle n'en fait qu'une URL.
   */
  photoUpdatedAt?: string | number | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Filters {
  search: string;
  gender: string;
  status: string;
  type: string;
  season?: string;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
}
