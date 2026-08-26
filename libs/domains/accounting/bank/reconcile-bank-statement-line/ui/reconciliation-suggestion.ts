import type { BankStatementLine } from './reconciliation-types';

/** La suggestion telle qu'elle est stockée sur la ligne de relevé. */
export interface ParsedSuggestion {
  kind?: 'entry' | 'internal-transfer';
  category?: number | string | null;
  memberId?: number | string | null;
  memberName?: string | null;
  confidence?: number;
  accrualType?: string | null;
  accrualNote?: string | null;
  targetSeason?: string | null;
  reason?: string | null;
}

export function parseSuggestion(line: BankStatementLine): ParsedSuggestion | null {
  if (!line.aiSuggestions) return null;
  try {
    return JSON.parse(line.aiSuggestions) as ParsedSuggestion;
  } catch {
    return null;
  }
}

/**
 * Une suggestion validable d'un seul geste, ou rien.
 *
 * Un virement interne en est exclu, et c'est le point : il s'écrit en **deux** jambes, une par
 * compte, là où le rapprochement n'en produit qu'une. Le geste unitaire l'annonçait déjà et
 * renvoyait au grand livre ; le rapprochement par lot, lui, l'aurait enregistré comme une recette
 * ou une dépense ordinaire — faussant le compte de résultat sans rien dire.
 *
 * Une suggestion sans catégorie en est exclue aussi. Le lot retombait sur la catégorie 1,
 * « Adhésions & Inscriptions », exactement le défaut codé en dur qu'on vient de retirer d'ailleurs.
 */
export function isOneClickValidatable(sug: ParsedSuggestion | null): boolean {
  if (!sug) return false;
  if (sug.kind === 'internal-transfer') return false;
  return sug.category !== null && sug.category !== undefined && sug.category !== '';
}

/**
 * La requête de rapprochement déduite d'une suggestion.
 *
 * Elle sert le geste unitaire **et** le lot : ils divergeaient, et le lot y perdait trois champs.
 * `accrualType`, `accrualNote` et `targetSeason` n'étaient pas transmis — une cotisation encaissée
 * d'avance validée en lot devenait une écriture ordinaire rattachée à l'exercice consulté, soit
 * précisément l'erreur que le cut-off est là pour empêcher. Personne ne pouvait le voir : c'est le
 * compte de résultat qui l'aurait révélée, des mois plus tard.
 */
export function buildSuggestionRequest(line: BankStatementLine, browsedSeason: string) {
  const sug = parseSuggestion(line);
  if (!isOneClickValidatable(sug)) return null;

  const cents = (line as any).amountCents ?? line.amount ?? 0;
  return {
    btId: line.id,
    action: 'create' as const,
    memberId: sug!.memberId ? Number(sug!.memberId) : null,
    transaction: {
      seasonId: sug!.targetSeason || browsedSeason,
      type: cents < 0 ? ('depense' as const) : ('recette' as const),
      accountId: line.accountId,
      category: String(sug!.category),
      amount: Math.abs(cents),
      date: line.date,
      paymentMethod: 'virement',
      description: line.name,
      reference: line.memo || line.fitid,
      accrualType: sug!.accrualType || 'normal',
      accrualNote: sug!.accrualNote || null
    }
  };
}
