export function getPreviousSeasonId(currentId: string): string {
  const parts = currentId.split('-');
  if (parts.length === 2) {
    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);
    if (!isNaN(start) && !isNaN(end)) {
      const prevStart = (start - 1).toString().padStart(2, '0');
      const prevEnd = (end - 1).toString().padStart(2, '0');
      return `${prevStart}-${prevEnd}`;
    }
  }
  return '';
}

export function formatAmount(cents: number): string {
  const euros = cents / 100;
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(euros);
  return formatted.replace(/\s/g, '\u00a0') + '\u00a0€';
}

export function formatDelta(cents: number): string {
  const sign = cents >= 0 ? '+' : '';
  return sign + formatAmount(cents);
}

export const accountLabels: Record<string, string> = {
  current: 'Compte Courant',
  savings: 'Compte Livret',
  cash: 'Caisse Physique'
};

export function generatePieSlices(items: { label: string; value: number }[]) {
  const validItems = items.filter(item => item.value > 0);
  const total = validItems.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return [];

  let accumulatedPercent = 0;
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
  ];

  return validItems.map((item, index) => {
    const percent = item.value / total;
    const startAngle = accumulatedPercent * 2 * Math.PI;
    accumulatedPercent += percent;
    const endAngle = accumulatedPercent * 2 * Math.PI;

    const r = 80;
    const cx = 100;
    const cy = 100;
    
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);

    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      label: item.label,
      value: item.value,
      percent: (percent * 100).toFixed(1),
      pathData,
      color: colors[index % colors.length]
    };
  });
}
