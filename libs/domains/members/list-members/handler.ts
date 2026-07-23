import { type Db } from '@metacult/shared-db';
import { ListMembersRepository } from './repository';
import { ListMembersFilters, ListMembersPagination, ListMembersOutput } from "./dto";

export async function listMembers(
  db: Db,
  filters: ListMembersFilters,
  pagination: ListMembersPagination
): Promise<ListMembersOutput> {
  const repo = new ListMembersRepository();
  const offset = (pagination.page - 1) * pagination.limit;

  const total = await repo.count(db, filters);
  const data = await repo.list(db, filters, { limit: pagination.limit, offset });

  const totalPages = Math.ceil(total / pagination.limit) || 1;

  return {
    data,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    }
  };
}
