export class Season {
  id: string;
  closed: boolean;
  active: boolean;

  constructor(data: { id: string; closed?: boolean; active?: boolean }) {
    this.id = data.id;
    this.closed = !!data.closed;
    this.active = !!data.active;
  }

  isClosed(): boolean {
    return this.closed;
  }

  isActive(): boolean {
    return this.active;
  }
}
