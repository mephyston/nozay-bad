export interface UnsubscribeInput {
  /** Email du compte adhérent, issu de la session. */
  email: string;
  endpoint: string;
}

export interface UnsubscribeOutput {
  removed: number;
}
