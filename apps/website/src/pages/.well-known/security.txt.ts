import type { APIRoute } from 'astro';
import { securityTxtResponse } from '@nba/security-headers';
import { resolveEnv } from '../../lib/request-context';

/** Où signaler une faille (RFC 9116) ; le contact vient de `SECURITY_CONTACT`. */
export const GET: APIRoute = ({ locals, url }) => securityTxtResponse(resolveEnv(locals)?.SECURITY_CONTACT, url);
