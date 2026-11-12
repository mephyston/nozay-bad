import type { FeeBreakdown } from '../dto';

/** Un montant à l'euro près : « 62 € ». Les centimes n'apprennent rien à cette échelle. */
export function euros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(Math.round(cents / 100))
    .replace(/\s/g, ' ');
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

/** D'où viennent les chiffres, dit en une phrase. */
export function sourceLabel(data: Pick<FeeBreakdown, 'source' | 'sourceSeason'>): string {
  if (data.source === 'budget') return `D'après le budget de la saison ${data.sourceSeason}.`;
  if (data.source === 'previous') return `D'après les comptes de la saison ${data.sourceSeason}, la dernière complète.`;
  return `D'après les mouvements passés depuis le début de la saison ${data.sourceSeason} : chiffres partiels.`;
}

export interface Row { key: string; label: string; cents: number; share: number; highlight: boolean }

/**
 * Les charges, ramenées soit au coût d'un adhérent, soit à **une** cotisation donnée :
 * « vos 150 € servent à… ». Les parts restent celles des charges, seul le total change.
 */
export function chargeRows(data: FeeBreakdown, feeCents?: number): Row[] {
  return data.charges.map((c) => ({
    key: String(c.id ?? 'autres'),
    label: c.label,
    cents: feeCents !== undefined ? Math.round(c.share * feeCents) : c.perMemberCents,
    share: c.share,
    highlight: false
  }));
}

export function resourceRows(data: FeeBreakdown): Row[] {
  return data.resources.map((r) => ({
    key: String(r.id ?? 'autres'),
    label: r.label,
    cents: r.perMemberCents,
    share: r.share,
    highlight: r.membershipFees
  }));
}

/** Les ressources autres que les cotisations, les plus fortes d'abord, en liste lisible. */
export function otherResourceNames(data: FeeBreakdown, max = 3): string {
  const names = data.resources.filter((r) => !r.membershipFees && r.id !== null).slice(0, max).map((r) => r.label.toLowerCase());
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}
