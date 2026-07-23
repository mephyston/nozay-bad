export class AccountClass {
  code: string;
  label: string;
  type: string;

  constructor(data: { code: string; label: string; type: string }) {
    this.code = data.code;
    this.label = data.label;
    this.type = data.type;
  }
}
