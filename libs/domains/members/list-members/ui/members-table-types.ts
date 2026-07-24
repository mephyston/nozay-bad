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
