import type { AccountEntry } from './account-types';
import { findAccount, type AccountLike } from '../../../shared/account-labels';

/**
 * Les avances des adhérents encore à rendre.
 *
 * Une adhérente vire au club (virement compte d'attente → courant, jambe `source` sur le
 * compte d'attente), puis le club lui rend la somme sur Badnet (virement Badnet → compte
 * d'attente, jambe `destination`). Entre les deux, le club lui doit l'argent. Cette liste est
 * ce qu'il reste à rendre : les virements reçus qu'aucun remboursement n'a encore appariés.
 *
 * L'appariement n'a pas de clé en base — un virement ne connaît pas l'autre. Il se fait sur le
 * montant, puis sur la référence quand les deux en portent une, sinon sur le libellé normalisé,
 * et à défaut sur le seul montant, du plus ancien au plus récent. Le bouton « Créditer son
 * Badnet » de l'écran pré-remplit le libellé et la référence depuis la ligne choisie : c'est ce
 * qui rend l'appariement sûr sur le chemin normal.
 *
 * Les écritures reçues ici couvrent tous les exercices ouverts, pas seulement celui que
 * l'écran affiche : un virement reçu en août se rend en septembre, sur l'exercice suivant, et
 * l'appariement doit voir les deux. Une avance non rendue au 31 août reste due.
 */
export interface PendingAdvance {
  id: number;
  date: string;
  description: string;
  reference: string | null;
  amountCents: number;
  ageDays: number;
}

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(recu de|rendu a)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000));

export function pendingMemberAdvances(
  entries: AccountEntry[],
  accounts: (AccountLike & { kind?: string })[],
  today: string
): { pending: PendingAdvance[]; totalCents: number } {
  // Par nature et non par code : reçu depuis un compte bancaire, rendu vers un porte-monnaie.
  const kindOf = (id: number | null) => findAccount(accounts, id)?.kind ?? '';
  const byDate = (a: AccountEntry, b: AccountEntry) => a.date.localeCompare(b.date) || a.id - b.id;

  const received = entries
    .filter((e) => e.type === 'transfert' && e.transferLeg === 'source' && kindOf(e.counterpartAccountId) === 'bank')
    .sort(byDate);
  const returned = entries
    .filter((e) => e.type === 'transfert' && e.transferLeg === 'destination' && kindOf(e.counterpartAccountId) === 'wallet')
    .sort(byDate);

  const matched = new Set<number>();
  for (const back of returned) {
    const candidates = received.filter((r) => !matched.has(r.id) && r.amount === back.amount);
    const exact = candidates.find((r) =>
      r.reference && back.reference
        ? r.reference === back.reference
        : normalise(r.description) === normalise(back.description)
    );
    const chosen = exact ?? candidates[0];
    if (chosen) matched.add(chosen.id);
  }

  const pending = received
    .filter((r) => !matched.has(r.id))
    .map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      reference: r.reference,
      amountCents: r.amount,
      ageDays: daysBetween(r.date, today)
    }));

  return { pending, totalCents: pending.reduce((sum, p) => sum + p.amountCents, 0) };
}
