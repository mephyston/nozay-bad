/**
 * Les règles portées par une adhésion : ce qu'elle doit, ce qu'elle a reçu, ce qu'elle
 * autorise. L'identité vient de la personne et n'est ici que de passage, pour l'attestation.
 *
 * Les repli `?? 0` ont disparu avec le type qui les rendait nécessaires : `MemberSummary`
 * promettait `amountDue` / `amountReceived`, que les requêtes n'ont jamais renvoyés — elles
 * rendaient `amountDueCents` et `amountReceivedCents`. Les deux formes cohabitaient donc
 * ici, et l'on ne savait plus laquelle faisait foi.
 */
export interface MemberData {
  lastName: string;
  firstName: string;
  birthDate: string;
  amountDueCents: number;
  amountReceivedCents: number;
  paid: boolean;
}

export class Member {
  constructor(private readonly data: MemberData) {}

  get amountReceived(): number {
    return this.data.amountReceivedCents;
  }

  get amountDue(): number {
    return this.data.amountDueCents;
  }

  get paid(): boolean {
    return this.data.paid;
  }

  get lastName(): string {
    return this.data.lastName;
  }

  get firstName(): string {
    return this.data.firstName;
  }

  get birthDate(): string {
    return this.data.birthDate;
  }

  /**
   * Un premier règlement suffit : l'attestation certifie ce qui a été payé, et un comité
   * d'entreprise rembourse sur cette base sans attendre le solde. Elle dit alors le
   * montant réglé à ce jour à côté du montant dû (cf. attestation/format.ts).
   */
  canReceiveAttestation(): boolean {
    return this.data.paid || this.data.amountReceivedCents > 0;
  }

  /** Le solde est-il encore ouvert, quelque chose ayant déjà été versé ? */
  get partiallyPaid(): boolean {
    return !this.data.paid && this.data.amountReceivedCents > 0;
  }

}
