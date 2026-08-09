import type { APIRoute } from 'astro';

/**
 * WordPress servait le flux sur `/feed/`.
 *
 * Des lecteurs y sont abonnés depuis des années : la redirection permanente les
 * reporte sur le nouveau flux sans qu'ils aient à faire quoi que ce soit.
 */
export const GET: APIRoute = ({ url }) => Response.redirect(new URL('/rss.xml', url.origin).toString(), 301);
