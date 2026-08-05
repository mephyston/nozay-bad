/**
 * Ciblage d'une diffusion.
 *
 * Volontairement limité à ce que le domaine sait résoudre seul : le contexte
 * notifications ne dépend d'aucun autre domaine (il serait sinon pris dans le cycle
 * members → accounting → expenses → notifications). Les cibles qui exigent des
 * données adhérents — « cotisation non soldée », un adhérent précis — sont résolues
 * en amont, dans `apps/api`, et arrivent ici sous forme de liste d'emails.
 */
export type NotificationTarget =
  /** Tous les appareils abonnés. */
  | { kind: 'all' }
  /** Liste explicite d'emails de comptes. */
  | { kind: 'emails'; emails: string[] };

/** Étiquette conservée dans l'historique, indépendante de la résolution technique. */
export type NotificationTargetLabel = 'all' | 'unpaid' | 'emails';

export interface EnqueueNotificationInput {
  title: string;
  body: string;
  /** Chemin relatif ouvert au clic (ex. `/note-de-frais`). */
  url?: string;
  target: NotificationTarget;
  /** Ce qui sera affiché dans l'historique. Par défaut, le `kind` de la cible. */
  targetLabel?: NotificationTargetLabel;
  /** `admin` pour un envoi manuel, sinon l'événement à l'origine du message. */
  source?: string;
  /**
   * Anti-doublon : si un message de même `source` a déjà été créé après cette date,
   * l'envoi est ignoré. Indispensable pour les rappels programmés, un Cron Trigger
   * pouvant être invoqué plusieurs fois pour la même échéance.
   */
  skipIfSentSince?: Date;
}

export interface EnqueueNotificationOutput {
  messageId: number;
  /** Nombre d'appareils mis en file. 0 = personne d'abonné dans la cible. */
  queued: number;
  /** Vrai si l'envoi a été ignoré par la garde anti-doublon. */
  skipped?: boolean;
}
