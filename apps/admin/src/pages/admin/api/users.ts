import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { hasPermission } from '@nba/iam';

export async function GET({ locals }: any) {
  const user = locals.user;
  
  if (!user || (!hasPermission(user.permissions, '*') && !hasPermission(user.permissions, 'iam:*'))) {
    return new Response(JSON.stringify([]), { status: 403 });
  }

  const apiService = createApiClient(env);
  const res = await apiService.fetch('http://localhost/iam/users');
  return new Response(await res.text(), {
    headers: { 'Content-Type': 'application/json' }
  });
}
