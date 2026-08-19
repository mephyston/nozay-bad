import type { Member } from './expense-form-types';

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

export function scrollOptionIntoView(index: number) {
  setTimeout(() => {
    const container = document.getElementById('expense-member-listbox');
    const option = document.getElementById(`expense-member-option-${index}`);
    if (container && option) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.clientHeight;

      if (optionTop < containerTop) {
        container.scrollTop = optionTop;
      } else if (optionBottom > containerBottom) {
        container.scrollTop = optionBottom - container.clientHeight;
      }
    }
  }, 0);
}
