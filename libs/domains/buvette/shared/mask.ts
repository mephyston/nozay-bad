/** Une adresse masquée : de quoi reconnaître le client, sans la dévoiler au bénévole. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}
