export class AccountClass {
  id?: number;
  code: string;
  label: string;
  type: string;

  constructor(data: { id?: number; code: string; label: string; type: string }) {
    this.id = data.id;
    this.code = data.code;
    this.label = data.label;
    this.type = data.type;
  }
}
