export class Member {
  constructor(private readonly data: {
    id: number;
    licence: string;
    season: string;
    lastName: string;
    firstName: string;
    gender: 'M' | 'F';
    birthDate: string;
    email: string | null;
    phone: string | null;
    status: string;
    type: string;
    amountDue: number;
    amountReceived: number;
    amountRemaining: number;
    paid: boolean;
  }) {}

  get amountReceived(): number {
    return (this.data as any).amountReceivedCents ?? this.data.amountReceived;
  }

  get amountDue(): number {
    return (this.data as any).amountDueCents ?? this.data.amountDue;
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

  get season(): string {
    return this.data.season;
  }

  canReceiveAttestation(): boolean {
    return this.data.paid;
  }

  calculatePayment(amountCents: number): { amountReceivedCents: number; amountRemainingCents: number; paid: boolean } {
    const currentReceived = (this.data as any).amountReceivedCents ?? this.data.amountReceived ?? 0;
    const currentDue = (this.data as any).amountDueCents ?? this.data.amountDue ?? 0;
    const newReceived = currentReceived + amountCents;
    const newRemaining = Math.max(0, currentDue - newReceived);
    const isPaid = newRemaining === 0;
    return {
      amountReceivedCents: newReceived,
      amountRemainingCents: newRemaining,
      paid: isPaid
    };
  }
}
