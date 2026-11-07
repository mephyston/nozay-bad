import type { APIRoute } from 'astro';
import { forCard } from '../../lib/card-api';

export const POST: APIRoute = ({ locals }) => forCard(locals, 'revoke-devices');
