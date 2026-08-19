import type { Member } from './catalog-types';

export function formatMemberName(m: Member | null): string {
  if (!m) return '';
  const maskedLast = m.lastName
    ? (m.lastName.length > 2 && !m.lastName.endsWith('.') ? `${m.lastName[0]}.` : m.lastName)
    : '';
  return `${maskedLast} ${m.firstName}`.trim();
}

export function formatLicence(licence: string): string {
  if (!licence) return '***';
  if (licence.includes('*')) return licence;
  if (licence.length <= 4) return '***';
  return `${licence.slice(0, 2)}***${licence.slice(-2)}`;
}
