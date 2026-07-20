export interface ListMembersFilters {
    search?: string;
    gender?: 'M' | 'F';
    type?: string;
    status?: string;
    season?: string;
    paid?: boolean;
  }
export interface ListMembersPagination { page: number; limit: number }

export type ListMembersOutput = any;
