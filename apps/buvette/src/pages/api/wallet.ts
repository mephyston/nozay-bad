import type { APIRoute } from 'astro';
import { forCard } from '../../lib/card-api';

export const GET: APIRoute = ({ locals }) => forCard(locals, 'wallet');
