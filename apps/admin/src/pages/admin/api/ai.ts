import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const apiService = createApiClient(env);
    
    // Call the internal Hono API
    const res = await apiService.fetch('http://localhost/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('API Error in /admin/api/ai:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
