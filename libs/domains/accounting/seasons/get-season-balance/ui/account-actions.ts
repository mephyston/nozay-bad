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

/*
 * Rendre une avance : depuis le porte-monnaie du club vers celui de l'adhérente, pour l'argent
 * qu'elle a viré au club. Ce geste n'est pas au menu : il part de l'encart des avances en
 * attente, pré-rempli de la ligne choisie. Le virement reçu, lui, se saisit au rapprochement
 * (nature « Avance d'un adhérent »), là où il apparaît.
 */
const MEMBER_REFUND: AccountAction = {
  key: 'member-refund',
  label: "Crédit du porte-monnaie d'une adhérente",
  panel: 'transfert',
  source: '*wallet',
  destination: THIRD_PARTY,
  paymentKind: 'internal',
  descriptionTemplate: 'Rendu à ',
  refundsPendingAdvance: true
};

/** Le moyen de paiement que la nature du compte impose à une recette ou une dépense. */
const PAIEMENT: Record<AccountKindLike, AccountAction['paymentKind']> = {
  bank: 'transfer',
  cash: 'cash',
  wallet: 'transfer',
  voucher: 'voucher',
  third_party: 'transfer'
};

/**
 * Les trois mêmes gestes sur tous les comptes : recette, dépense, virement.
 *
 * Chaque nature de compte avait son menu de gestes métier — six pour un porte-monnaie, dont
 * deux qui ne le concernaient pas —, chacun suivi d'un paragraphe à lire avant de savoir quel
 * formulaire il ouvrait. Le vocabulaire est désormais celui du grand livre et du
 * rapprochement ; ce qui est propre au compte (le moyen de paiement, le compte d'en face par
 * défaut) est pré-rempli, et l'explication s'affiche dans le formulaire, au moment où elle
 * sert (`account-hints.ts`).
 *
 * Le compte d'attente des adhérents n'a pas de menu : on n'y saisit rien à la main.
 */
export function accountActions(kind: AccountKindLike | string): AccountAction[] {
  if (kind === 'third_party') return [];
  const paiement = PAIEMENT[kind as AccountKindLike] ?? 'transfer';
  return [
    { key: 'recette', label: 'Recette', panel: 'recette', source: SELF, paymentKind: paiement },
    { key: 'depense', label: 'Dépense', panel: 'depense', source: SELF, paymentKind: paiement },
    // Le virement le plus courant d'un compte sans relevé repart vers la banque : dépôt,
    // rapatriement, remboursement de l'organisme. Le formulaire laisse inverser.
    { key: 'virement', label: 'Virement', panel: 'transfert', source: SELF, destination: kind === 'bank' ? '*' : MAIN_BANK, paymentKind: 'internal' }
  ];
}

/** Le geste qui rend une avance en attente, sur les comptes qui affichent l'encart. */
export function refundActionFor(kind: AccountKindLike | string): AccountAction | null {
  if (kind === 'wallet') return { ...MEMBER_REFUND, source: SELF };
  if (kind === 'third_party') return MEMBER_REFUND;
  return null;
}

/** Vrai si l'écran de ce compte doit montrer les avances des adhérents en attente. */
export function showsMemberAdvances(kind: AccountKindLike | string): boolean {
  return refundActionFor(kind) !== null;
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
