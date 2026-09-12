import type { MemberSummary } from '../shared/queries';


export interface ListMembersFilters {
  search?: string;
  gender?: 'M' | 'F';
  type?: string;
  status?: string;
  season?: string;
  paid?: boolean;
  /**
   * Cohorte par rapport à la saison précédente : `new` (aucune adhésion en n-1), `renewed`
   * (une adhésion en n-1), `lapsed` (adhérent de n-1 sans adhésion cette saison — la liste
   * montre alors les adhésions de n-1). Sans saison, le critère est ignoré.
   */
  cohort?: 'new' | 'renewed' | 'lapsed';
}
export interface ListMembersPagination { page: number; limit: number }

export type ListMembersOutput = {
  data: MemberSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
