import type { NotificationCategory } from './categories';

/**
 * Description d'une notification automatique, à destination de l'écran d'administration.
 *
 * Les envois automatiques sont câblés dans le code (cron du Worker API, événements
 * métier) : il n'existe aucune table de planification. Ce type est donc **purement
 * déclaratif** — le domaine notifications définit la forme, mais c'est l'application
 * qui remplit le registre : elle seule connaît les notifications des autres domaines
 * (adhérents, boutique, interclubs), et le domaine notifications doit rester feuille.
 */
export interface ScheduledNotificationView {
  /** Identifiant stable — le `source` des messages émis (`birthday:daily`, …). */
  id: string;
  /** Titre type de la notification, tel que reçu par l'adhérent. */
  title: string;
  /** Corps type (les valeurs variables sont décrites, pas résolues). */
  body: string;
  /** Fréquence (cron) ou déclencheur (événement), en français. */
  schedule: string;
  /** `cron` : envoi récurrent planifié ; `event` : déclenché par une action métier. */
  trigger: 'cron' | 'event';
  category: NotificationCategory;
  /** Kill-switch résolu : `false` = rien ne part tant que le drapeau n'est pas activé. */
  enabled: boolean;
  /** Nom de la variable d'environnement qui pilote l'envoi, `null` si toujours actif. */
  flag: string | null;
}
