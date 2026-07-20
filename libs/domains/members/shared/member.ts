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
    return this.data.amountReceived;
  }

  get amountDue(): number {
    return this.data.amountDue;
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

  calculatePayment(amountCents: number): { amountReceived: number; amountRemaining: number; paid: boolean } {
    const newReceived = this.data.amountReceived + amountCents;
    const newRemaining = Math.max(0, this.data.amountDue - newReceived);
    const isPaid = newRemaining === 0;
    return {
      amountReceived: newReceived,
      amountRemaining: newRemaining,
      paid: isPaid
    };
  }
}
