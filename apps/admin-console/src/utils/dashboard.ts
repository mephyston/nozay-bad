export async function resolveActiveSeason(apiService: any): Promise<string> {
  try {
    const res = await apiService.fetch('http://localhost/accounting/seasons');
    if (!res.ok) {
      return '25-26';
    }
    const json = await res.json() as any;
    const seasonsList = json.data || [];
    const activeSeason = seasonsList.find((s: any) => s.active === true || s.active === 1);
    return activeSeason ? activeSeason.id : '25-26';
  } catch (err) {
    return '25-26';
  }
}

export async function fetchTreasuryBalance(apiService: any, seasonId: string): Promise<number | null> {
  try {
    const res = await apiService.fetch(`http://localhost/accounting/seasons/${seasonId}/balance`);
    if (!res.ok) {
      return null;
    }
    const json = await res.json() as any;
    if (json && json.success && json.data && typeof json.data.balance === 'number') {
      return json.data.balance;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function formatTreasuryBalance(balanceCents: number | null): string {
  if (balanceCents === null || balanceCents === undefined || typeof balanceCents !== 'number') {
    return '--';
  }
  const euros = balanceCents / 100;
  return euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export async function fetchMembersCount(apiService: any, seasonId: string, paid?: boolean): Promise<number | null> {
  try {
    const queryParams = new URLSearchParams({ season: seasonId, limit: '1' });
    if (paid) {
      queryParams.set('paid', 'true');
    }
    const res = await apiService.fetch(`http://localhost/members?${queryParams.toString()}`);
    if (!res.ok) {
      return null;
    }
    const json = await res.json() as any;
    if (json && json.success && json.pagination && typeof json.pagination.total === 'number') {
      return json.pagination.total;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function calculatePaidPercentage(paidCount: number | null, totalCount: number | null): number | null {
  if (paidCount === null || totalCount === null) {
    return null;
  }
  if (totalCount === 0) {
    return 0;
  }
  return Math.round((paidCount / totalCount) * 100);
}

export function formatPaidPercentage(percentage: number | null): string {
  if (percentage === null || percentage === undefined) {
    return '--% des inscriptions validées';
  }
  return `${percentage}% des inscriptions validées`;
}
