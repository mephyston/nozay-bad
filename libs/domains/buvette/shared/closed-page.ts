/**
 * La page servie par la caisse et l'app des clients quand le club a éteint la buvette
 * (`club_features.buvette`). Un 503 et non un 404 : la buvette existe, elle est fermée pour
 * le moment. Les appels d'API reçoivent le même message, en JSON, pour que la caisse l'affiche
 * au lieu d'un « ressource introuvable ».
 *
 * Page autonome, sans Astro ni Svelte : elle sort du middleware, avant tout rendu.
 */
const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface ClosedPage {
  title: string;
  message: string;
  /** Une phrase de plus, en petit : à qui s'adresser, ce qui est conservé. */
  hint?: string;
  clubName: string;
}

export function buvetteClosedResponse(page: ClosedPage, request: Request): Response {
  const headers = { 'Cache-Control': 'no-store', 'Retry-After': '300' };
  if (new URL(request.url).pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ success: false, ok: false, error: `${page.title}. ${page.message}` }), {
      status: 503,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  const title = escape(page.title);
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { --bg: #f6f7f9; --card: #fff; --text: #1a1d23; --muted: #5d6573; --border: #e3e6eb; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111317; --card: #1a1d23; --text: #eef0f3; --muted: #a0a7b4; --border: #2a2f38; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--text);
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width: 100%; max-width: 26rem; background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 32px 24px; text-align: center; }
  img { width: 72px; height: 72px; object-fit: contain; }
  h1 { font-size: 1.4rem; margin: 16px 0 8px; }
  p { margin: 0 0 12px; }
  .hint { color: var(--muted); font-size: .9rem; }
  a { display: inline-block; margin-top: 12px; padding: 10px 18px; border-radius: 12px; border: 1px solid var(--border); color: inherit; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<main>
  <img src="/logo.png" alt="">
  <h1>${title}</h1>
  <p>${escape(page.message)}</p>
  ${page.hint ? `<p class="hint">${escape(page.hint)}</p>` : ''}
  <a href="/">Réessayer</a>
  ${page.clubName ? `<p class="hint" style="margin-top:20px">${escape(page.clubName)}</p>` : ''}
</main>
</body>
</html>`;
  return new Response(html, { status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}
