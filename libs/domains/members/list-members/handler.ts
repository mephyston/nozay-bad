import { ListMembersRepository } from './repository';

export async function listMembers(
  db: any,
  filters: {
    search?: string;
    gender?: 'M' | 'F';
    type?: string;
    status?: string;
    season?: string;
    paid?: boolean;
  },
  pagination: { page: number; limit: number }
) {
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
