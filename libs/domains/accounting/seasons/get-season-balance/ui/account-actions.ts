import type { TransactionFormValues } from '../../../ledger/list-ledger-entries/ui/ledger-actions';
import type { AccountLike } from '../../../shared/account-labels';

/**
 * Les gestes qu'un trésorier fait sur un compte sans relevé, pré-câblés.
 *
 * Le grand livre sait tout saisir, mais il demande à chaque fois de choisir les comptes, le
 * sens et le mode de règlement : pour une saisie mensuelle répétitive, c'est là que l'erreur
 * se glisse. Ici chaque action fixe d'avance ce qui ne varie pas, et ne laisse au trésorier
 * que le montant, la date et le nom.
 *
 * Les codes de compte sont assumés dans ce module : ce sont des parcours métier (le
 * porte-monnaie Badnet, la caisse, le compte d'attente des adhérents), pas des identifiants
 * techniques. Un compte inconnu de la table reçoit le catalogue générique.
 */
export interface AccountAction {
  key: string;
  label: string;
  hint?: string;
  panel: 'recette' | 'depense' | 'transfert';
  /** Compte débité (jambe source) d'un virement, ou compte de la recette / dépense. `'*'` = au choix. */
  source: string;
  /** Compte crédité d'un virement. `'*'` = au choix parmi les autres comptes. */
  destination?: string;
  paymentMethod: string;
  /** Début de libellé proposé ; le trésorier complète (le nom de l'adhérente, le tournoi…). */
  descriptionTemplate?: string;
  /** L'action rend une avance en attente : elle se pré-remplit depuis la ligne choisie. */
  refundsPendingAdvance?: boolean;
}

export const MEMBER_ADVANCES_CODE = 'member_advances';
export const BADNET_CODE = 'badnet';
export const CURRENT_CODE = 'current';

const MEMBER_RECEIVED: AccountAction = {
  key: 'member-received',
  label: "Virement reçu d'une adhérente",
  hint: "Elle a viré sur le compte courant pour que le club crédite son porte-monnaie Badnet. Hors résultat : c'est de l'argent à lui rendre.",
  panel: 'transfert',
  source: MEMBER_ADVANCES_CODE,
  destination: CURRENT_CODE,
  paymentMethod: 'virement_interne',
  descriptionTemplate: 'Reçu de '
};

const MEMBER_REFUND: AccountAction = {
  key: 'member-refund',
  label: 'Remboursement sur son porte-monnaie Badnet',
  hint: 'Le club crédite le porte-monnaie de l’adhérente depuis le sien : la dette est éteinte.',
  panel: 'transfert',
  source: BADNET_CODE,
  destination: MEMBER_ADVANCES_CODE,
  paymentMethod: 'virement_interne',
  descriptionTemplate: 'Rendu à ',
  refundsPendingAdvance: true
};

const CATALOGUE: Record<string, AccountAction[]> = {
  cash: [
    { key: 'cash-in', label: "Entrée d'espèces", panel: 'recette', source: 'cash', paymentMethod: 'especes' },
    { key: 'cash-out', label: "Sortie d'espèces", panel: 'depense', source: 'cash', paymentMethod: 'especes' },
    { key: 'deposit', label: 'Dépôt en banque', hint: 'Les espèces quittent la caisse pour le compte courant.', panel: 'transfert', source: 'cash', destination: CURRENT_CODE, paymentMethod: 'virement_interne', descriptionTemplate: 'Dépôt des espèces en banque' }
  ],
  badnet: [
    MEMBER_RECEIVED,
    MEMBER_REFUND,
    { key: 'topup', label: 'Recharge du porte-monnaie', hint: 'Depuis le compte courant. Hors résultat.', panel: 'transfert', source: CURRENT_CODE, destination: BADNET_CODE, paymentMethod: 'virement_interne', descriptionTemplate: 'Recharge du porte-monnaie Badnet' },
    { key: 'withdraw', label: 'Rapatriement en banque', hint: 'Après un tournoi du club, les inscriptions encaissées reviennent sur le compte courant.', panel: 'transfert', source: BADNET_CODE, destination: CURRENT_CODE, paymentMethod: 'virement_interne', descriptionTemplate: 'Rapatriement Badnet vers la banque' },
    { key: 'fee-in', label: 'Inscriptions encaissées (tournoi du club)', hint: 'Une recette, catégorie Tournois. Une écriture par tournoi suffit.', panel: 'recette', source: BADNET_CODE, paymentMethod: 'virement', descriptionTemplate: 'Inscriptions tournoi ' },
    { key: 'fee-out', label: 'Inscription payée ou commission', hint: "Une dépense : l'inscription d'une équipe, ou la commission prélevée par Badnet.", panel: 'depense', source: BADNET_CODE, paymentMethod: 'virement' }
  ],
  member_advances: [MEMBER_RECEIVED, MEMBER_REFUND]
};

const GENERIC = (code: string): AccountAction[] => [
  { key: 'in', label: 'Entrée', panel: 'recette', source: code, paymentMethod: 'virement' },
  { key: 'out', label: 'Sortie', panel: 'depense', source: code, paymentMethod: 'virement' },
  { key: 'transfer-in', label: "Virement depuis un autre compte", panel: 'transfert', source: '*', destination: code, paymentMethod: 'virement_interne' },
  { key: 'transfer-out', label: 'Virement vers un autre compte', panel: 'transfert', source: code, destination: '*', paymentMethod: 'virement_interne' }
];

export function accountActions(code: string): AccountAction[] {
  return CATALOGUE[code] ?? GENERIC(code);
}

/** Vrai si l'écran de ce compte doit montrer les avances des adhérents en attente. */
export function showsMemberAdvances(code: string): boolean {
  return accountActions(code).some((a) => a.refundsPendingAdvance);
}

export interface PrefillContext {
  today: string;
  targetSeasonId: string;
  /** Les comptes connus, pour proposer un compte « au choix » qui ne soit pas celui de l'action. */
  accounts: AccountLike[];
  /** L'avance en attente que l'action rend, quand elle en rend une. */
  pending?: { description: string; reference: string | null; amountCents: number } | null;
}

/** Les valeurs du formulaire du grand livre, prêtes pour l'action choisie. */
export function prefillAction(action: AccountAction, ctx: PrefillContext): TransactionFormValues {
  const other = (notThis: string) => ctx.accounts.find((a) => a.code !== notThis)?.code ?? CURRENT_CODE;
  const source = action.source === '*' ? other(action.destination ?? '') : action.source;
  const destination = action.destination === '*' ? other(source) : action.destination ?? '';

  const pending = action.refundsPendingAdvance ? ctx.pending : null;
  const description = pending
    ? pending.description.replace(/^Reçu de /i, 'Rendu à ')
    : action.descriptionTemplate ?? '';

  return {
    editingId: null,
    showPanel: action.panel,
    amount: pending ? (pending.amountCents / 100).toFixed(2) : '',
    date: ctx.today,
    category: '',
    formAccountId: source,
    destinationAccountId: destination,
    destinationDate: '',
    paymentMethod: action.paymentMethod,
    description,
    reference: pending?.reference ?? '',
    accrualType: 'normal',
    accrualNote: '',
    targetSeasonId: ctx.targetSeasonId
  };
}
