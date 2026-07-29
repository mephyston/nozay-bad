import { membersTable } from '@nba/members/schema';


export interface ListMembersFilters {
  search?: string;
  gender?: 'M' | 'F';
  type?: string;
  status?: string;
  season?: string;
  paid?: boolean;
}
export interface ListMembersPagination { page: number; limit: number }

export type ListMembersOutput = {
  data: (typeof membersTable.$inferSelect)[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
