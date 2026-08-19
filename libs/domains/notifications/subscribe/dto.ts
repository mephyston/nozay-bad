export interface SubscribeInput {
  /** Email du compte adhérent, issu de la session (jamais du corps de la requête client). */
  email: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export interface SubscribeOutput {
  id: number;
}
