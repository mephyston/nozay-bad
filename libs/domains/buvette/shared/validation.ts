import { AppError } from '@nba/db';

/** Le refus commun des validateurs TypeBox du domaine : 400 et la liste des champs fautifs. */
export function refuseInvalid(result: { success: boolean; errors?: unknown }, c: any) {
  if (result.success) return undefined;
  const errors = [...((result.errors as Iterable<any>) ?? [])];
  const detail = errors
    .map((e) => `${e.path || e.instancePath?.replace(/^\//, '') || 'champ'}: ${e.message}`)
    .join(', ');
  return c.json({ success: false, error: `Validation failed: ${detail}` }, 400);
}

/** L'adresse du bénévole, posée par le Worker de la caisse après contrôle de Cloudflare Access. */
export function actorEmail(c: any): string {
  const email = c.req.header('x-user-email');
  // Un acte de caisse sans auteur est un défaut de câblage du Worker : on échoue bruyamment.
  if (!email) throw new AppError('Identité appelante absente.', 401);
  return email;
}

/** La session vient d'être clôturée : le mouvement n'a plus de session, et le lot est annulé. */
export function isClosedSessionError(error: unknown): boolean {
  return /NOT NULL|buvette_card_movements_session_check/i.test(String(error));
}

export function tokenSecret(c: any): string {
  const secret = c.env?.BUVETTE_TOKEN_SECRET;
  if (!secret) throw new Error('BUVETTE_TOKEN_SECRET absent de la configuration du Worker');
  return secret;
}
