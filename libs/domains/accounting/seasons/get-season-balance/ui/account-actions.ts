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
 * Le catalogue se lit par **nature** de compte (`kind`) et non plus par code : un club dont
 * la caisse s'appelle `buvette`, ou qui a deux porte-monnaie, retrouve les mêmes gestes.
 * Les comptes d'en face sont désignés par nature aussi — `'*bank'`, le compte bancaire
 * principal ; `'*third_party'`, le compte d'attente des adhérents ; `'*'`, au choix —
 * et résolus au pré-remplissage parmi les comptes actifs du club. Les moyens de paiement
 * de même : c'est la nature qui est fixée, le moyen actif de cette nature qui est choisi.
 */
export type ActionAccountRef = string;

export interface AccountAction {
  key: string;
  label: string;
  hint?: string;
  panel: 'recette' | 'depense' | 'transfert';
  /** Compte débité (jambe source) d'un virement, ou compte de la recette / dépense. `'*'` = au choix. */
  source: ActionAccountRef;
  /** Compte crédité d'un virement. `'*'` = au choix parmi les autres comptes. */
  destination?: ActionAccountRef;
  /** Nature du moyen de paiement à proposer ; le moyen actif de cette nature est retenu. */
  paymentKind: 'transfer' | 'cash' | 'internal';
  /** Début de libellé proposé ; le trésorier complète (le nom de l'adhérente, le tournoi…). */
  descriptionTemplate?: string;
  /** L'action rend une avance en attente : elle se pré-remplit depuis la ligne choisie. */
  refundsPendingAdvance?: boolean;
}

/** Le compte lui-même, celui dont l'écran est ouvert. */
export const SELF = '*self';
/** Le compte bancaire principal du club : le premier compte `bank` actif. */
export const MAIN_BANK = '*bank';
/** Le compte d'attente des adhérents (nature `third_party`). */
export const THIRD_PARTY = '*third_party';

export type AccountKindLike = 'bank' | 'cash' | 'wallet' | 'third_party';

const MEMBER_RECEIVED: AccountAction = {
  key: 'member-received',
  label: "Virement reçu d'une adhérente",
  hint: "Elle a viré sur le compte courant pour que le club crédite son porte-monnaie. Hors résultat : c'est de l'argent à lui rendre.",
  panel: 'transfert',
  source: THIRD_PARTY,
  destination: MAIN_BANK,
  paymentKind: 'internal',
  descriptionTemplate: 'Reçu de '
};

const MEMBER_REFUND: AccountAction = {
  key: 'member-refund',
  label: "Crédit du porte-monnaie d'une adhérente",
  hint: "Depuis le porte-monnaie du club vers le sien, pour l'argent qu'elle a viré : la dette est éteinte.",
  panel: 'transfert',
  source: '*wallet',
  destination: THIRD_PARTY,
  paymentKind: 'internal',
  descriptionTemplate: 'Rendu à ',
  refundsPendingAdvance: true
};

const CATALOGUE: Record<AccountKindLike, AccountAction[]> = {
  cash: [
    { key: 'cash-in', label: "Entrée d'espèces", panel: 'recette', source: SELF, paymentKind: 'cash' },
    { key: 'cash-out', label: "Sortie d'espèces", panel: 'depense', source: SELF, paymentKind: 'cash' },
    { key: 'deposit', label: 'Dépôt en banque', hint: 'Les espèces quittent la caisse pour le compte bancaire.', panel: 'transfert', source: SELF, destination: MAIN_BANK, paymentKind: 'internal', descriptionTemplate: 'Dépôt des espèces en banque' }
  ],
  wallet: [
    MEMBER_RECEIVED,
    { ...MEMBER_REFUND, source: SELF },
    { key: 'topup', label: 'Recharge du porte-monnaie', hint: 'Depuis le compte bancaire. Hors résultat.', panel: 'transfert', source: MAIN_BANK, destination: SELF, paymentKind: 'internal', descriptionTemplate: 'Recharge du porte-monnaie' },
    { key: 'withdraw', label: 'Rapatriement en banque', hint: 'Après un tournoi du club, les inscriptions encaissées reviennent sur le compte bancaire.', panel: 'transfert', source: SELF, destination: MAIN_BANK, paymentKind: 'internal', descriptionTemplate: 'Rapatriement vers la banque' },
    { key: 'fee-in', label: 'Inscriptions encaissées (tournoi du club)', hint: 'Une recette, catégorie Tournois. Une écriture par tournoi suffit.', panel: 'recette', source: SELF, paymentKind: 'transfer', descriptionTemplate: 'Inscriptions tournoi ' },
    { key: 'fee-out', label: 'Inscription payée ou commission', hint: "Une dépense : l'inscription d'une équipe, ou la commission prélevée par la plateforme.", panel: 'depense', source: SELF, paymentKind: 'transfer' }
  ],
  third_party: [MEMBER_RECEIVED, MEMBER_REFUND],
  bank: [
    { key: 'in', label: 'Entrée', panel: 'recette', source: SELF, paymentKind: 'transfer' },
    { key: 'out', label: 'Sortie', panel: 'depense', source: SELF, paymentKind: 'transfer' },
    { key: 'transfer-in', label: 'Virement depuis un autre compte', panel: 'transfert', source: '*', destination: SELF, paymentKind: 'internal' },
    { key: 'transfer-out', label: 'Virement vers un autre compte', panel: 'transfert', source: SELF, destination: '*', paymentKind: 'internal' }
  ]
};

export function accountActions(kind: AccountKindLike | string): AccountAction[] {
  return CATALOGUE[kind as AccountKindLike] ?? CATALOGUE.bank;
}

/** Vrai si l'écran de ce compte doit montrer les avances des adhérents en attente. */
export function showsMemberAdvances(kind: AccountKindLike | string): boolean {
  return accountActions(kind).some((a) => a.refundsPendingAdvance);
}

export interface PrefillContext {
  today: string;
  targetSeasonId: string;
  /** Le compte dont l'écran est ouvert : `'*self'` se résout sur lui. */
  self: AccountLike & { kind?: string };
  /** Les comptes connus (actifs), avec leur nature, pour résoudre les comptes d'en face. */
  accounts: (AccountLike & { kind?: string })[];
  /** Les moyens de paiement actifs, avec leur nature, pour résoudre celui de l'action. */
  paymentMethods: { code: string; kind: string }[];
  /** L'avance en attente que l'action rend, quand elle en rend une. */
  pending?: { description: string; reference: string | null; amountCents: number } | null;
}

/**
 * Résout une référence de compte du catalogue en code de compte, parmi les comptes actifs.
 * Un club sans compte de la nature demandée retombe sur « au choix », et le formulaire le
 * fera choisir — plutôt que de deviner un code qui n'existe pas.
 */
export function resolveAccountRef(ref: ActionAccountRef, ctx: Pick<PrefillContext, 'self' | 'accounts'>, notThis = ''): string {
  const byKind = (kind: string) => ctx.accounts.find((a) => a.kind === kind && a.code !== notThis)?.code;
  const anyOther = () => ctx.accounts.find((a) => a.code !== notThis)?.code ?? '';
  switch (ref) {
    case SELF:
      return ctx.self.code;
    case MAIN_BANK:
      return byKind('bank') ?? anyOther();
    case THIRD_PARTY:
      return byKind('third_party') ?? anyOther();
    case '*wallet':
      return byKind('wallet') ?? anyOther();
    case '*':
      return anyOther();
    default:
      return ref;
  }
}

/** Le moyen de paiement actif de la nature voulue ; le premier disponible à défaut. */
export function resolvePaymentKind(kind: AccountAction['paymentKind'], methods: PrefillContext['paymentMethods']): string {
  return methods.find((m) => m.kind === kind)?.code ?? methods.find((m) => m.kind !== 'internal')?.code ?? '';
}

/** Les valeurs du formulaire du grand livre, prêtes pour l'action choisie. */
export function prefillAction(action: AccountAction, ctx: PrefillContext): TransactionFormValues {
  const source = resolveAccountRef(action.source, ctx, action.destination ? resolveAccountRef(action.destination, ctx) : '');
  const destination = action.destination ? resolveAccountRef(action.destination, ctx, source) : '';

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
    paymentMethod: resolvePaymentKind(action.paymentKind, ctx.paymentMethods),
    description,
    reference: pending?.reference ?? '',
    accrualType: 'normal',
    accrualNote: '',
    targetSeasonId: ctx.targetSeasonId
  };
}
