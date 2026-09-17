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
  paymentKind: 'transfer' | 'cash' | 'voucher' | 'internal';
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

export type AccountKindLike = 'bank' | 'cash' | 'wallet' | 'voucher' | 'third_party';

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
  /*
   * La caisse reçoit bien plus que la buvette : une cotisation réglée en espèces y entre
   * aussi, et c'est le rattachement à l'adhérent qui la fait compter pour son dossier.
   */
  cash: [
    { key: 'cash-in', label: 'Espèces reçues', hint: "Cotisation, buvette, tournoi… payés en espèces : une recette. Quand c'est un adhérent qui paie, rattachez-le, c'est ce qui fait apparaître le règlement sur sa fiche.", panel: 'recette', source: SELF, paymentKind: 'cash' },
    { key: 'cash-out', label: 'Dépense payée en espèces', hint: 'Un achat réglé avec les espèces de la caisse.', panel: 'depense', source: SELF, paymentKind: 'cash' },
    { key: 'deposit', label: "Dépôt d'espèces en banque", hint: 'Les espèces quittent la caisse pour le compte bancaire. Hors résultat.', panel: 'transfert', source: SELF, destination: MAIN_BANK, paymentKind: 'internal', descriptionTemplate: 'Dépôt des espèces en banque' }
  ],
  wallet: [
    MEMBER_RECEIVED,
    { ...MEMBER_REFUND, source: SELF },
    { key: 'topup', label: 'Recharge du porte-monnaie depuis la banque', hint: 'Le club alimente son porte-monnaie chez la plateforme. Hors résultat.', panel: 'transfert', source: MAIN_BANK, destination: SELF, paymentKind: 'internal', descriptionTemplate: 'Recharge du porte-monnaie' },
    { key: 'withdraw', label: 'Rapatriement du porte-monnaie vers la banque', hint: 'Après un tournoi du club, les inscriptions encaissées reviennent sur le compte bancaire. Hors résultat.', panel: 'transfert', source: SELF, destination: MAIN_BANK, paymentKind: 'internal', descriptionTemplate: 'Rapatriement vers la banque' },
    { key: 'fee-in', label: 'Inscriptions encaissées (tournoi du club)', hint: 'Une recette, catégorie Tournois. Une écriture par tournoi suffit.', panel: 'recette', source: SELF, paymentKind: 'transfer', descriptionTemplate: 'Inscriptions tournoi ' },
    { key: 'fee-out', label: "Inscription payée ou commission de la plateforme", hint: "Une dépense : l'inscription d'une équipe à un tournoi, ou la commission prélevée par la plateforme.", panel: 'depense', source: SELF, paymentKind: 'transfer' }
  ],
  /*
   * Les bons et chèques tiers (Labaz, Pass'Sport, tickets loisir…) ne sont pas un
   * porte-monnaie : le club n'y verse rien et ne paie rien avec. L'adhérent présente un code
   * ou un QR code que le trésorier valide sur le site de l'organisme — ou remet un chèque
   * papier — et l'organisme rembourse le club plus tard, en un virement pour un lot de
   * paiements. Trois gestes, pas un de plus : le paiement validé est une recette à la date
   * où l'adhérent paie, rattachée à lui ; le remboursement est un virement vers la banque,
   * hors résultat ; la commission ou le paiement refusé, une dépense. Le solde du compte est
   * ce que l'organisme doit encore.
   */
  voucher: [
    { key: 'voucher-in', label: "Paiement d'un adhérent validé", hint: "Il a payé avec un code ou QR code (Labaz, Pass'Sport, ticket loisir…) que vous avez validé chez l'organisme, ou remis un chèque papier. Une recette à la date du paiement, catégorie de la cotisation ou de l'achat, rattachée à l'adhérent. Le remboursement viendra plus tard.", panel: 'recette', source: SELF, paymentKind: 'voucher' },
    { key: 'voucher-refund', label: "Remboursement de l'organisme reçu en banque", hint: "L'organisme a viré au club le remboursement des paiements validés : le montant reçu passe sur le compte bancaire. Hors résultat.", panel: 'transfert', source: SELF, destination: MAIN_BANK, paymentKind: 'internal', descriptionTemplate: 'Remboursement ' },
    { key: 'voucher-fee', label: 'Commission ou paiement refusé', hint: "Ce que l'organisme retient (commission) ou ne rembourse pas (code refusé, périmé) : une dépense, catégorie Frais de fonctionnement.", panel: 'depense', source: SELF, paymentKind: 'voucher' }
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
  /** Les moyens de paiement actifs, avec leur nature — et le compte qu'ils créditent, pour préférer celui du compte affiché. */
  paymentMethods: { code: string; kind: string; defaultAccountCode?: string }[];
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

/**
 * Le moyen de paiement actif de la nature voulue ; le premier disponible à défaut.
 * Parmi plusieurs de même nature — cinq sortes de bons —, celui qui crédite le compte affiché.
 */
export function resolvePaymentKind(kind: AccountAction['paymentKind'], methods: PrefillContext['paymentMethods'], selfCode = ''): string {
  const ofKind = methods.filter((m) => m.kind === kind);
  return (
    (selfCode && ofKind.find((m) => m.defaultAccountCode === selfCode)?.code) ||
    ofKind[0]?.code ||
    methods.find((m) => m.kind !== 'internal')?.code ||
    ''
  );
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
    paymentMethod: resolvePaymentKind(action.paymentKind, ctx.paymentMethods, ctx.self.code),
    description,
    reference: pending?.reference ?? '',
    accrualType: 'normal',
    accrualNote: '',
    targetSeasonId: ctx.targetSeasonId
  };
}
