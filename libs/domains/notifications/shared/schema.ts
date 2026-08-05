import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Abonnement push d'un appareil.
 *
 * La clé fonctionnelle est l'email du foyer, pas `members.id` : les identifiants
 * d'adhérent sont liés à une saison et changent à chaque import de licences, alors
 * qu'un abonnement doit survivre au renouvellement. C'est aussi l'identité portée
 * par la session OTP.
 */
export const pushSubscriptionsTable = sqliteTable(
  'push_subscriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    // Fourni par le service de push du navigateur ; identifie l'appareil de façon unique.
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    lastSuccessAt: integer('last_success_at', { mode: 'timestamp' })
  },
  (table) => ({
    emailIdx: index('push_subscriptions_email_idx').on(table.email)
  })
);

/**
 * Message à diffuser. Conservé après envoi : il sert d'historique consultable
 * depuis l'admin et évite de redemander à l'émetteur ce qui a déjà été envoyé.
 */
export const pushMessagesTable = sqliteTable('push_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  // Chemin ouvert au clic sur la notification (relatif au storefront).
  url: text('url'),
  target: text('target', { enum: ['all', 'unpaid', 'emails'] })
    .notNull()
    .default('all'),
  // Origine du message : 'admin' pour un envoi manuel, sinon l'événement métier.
  source: text('source').notNull().default('admin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

/**
 * File d'attente d'envoi (outbox), une ligne par appareil destinataire.
 *
 * L'envoi n'est jamais fait dans la requête qui déclenche la notification : un
 * Worker du plan gratuit est plafonné à 50 sous-requêtes par invocation, et une
 * diffusion à tout le club dépasse largement ce seuil. Un Cron Trigger draine la
 * file par lots, ce qui apporte au passage les réessais.
 */
export const pushDeliveriesTable = sqliteTable(
  'push_deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: integer('message_id').notNull(),
    subscriptionId: integer('subscription_id').notNull(),
    status: text('status', { enum: ['pending', 'sent', 'failed'] })
      .notNull()
      .default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    statusIdx: index('push_deliveries_status_idx').on(table.status),
    messageIdx: index('push_deliveries_message_idx').on(table.messageId)
  })
);

export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;
export type PushMessageRow = typeof pushMessagesTable.$inferSelect;
export type PushDeliveryRow = typeof pushDeliveriesTable.$inferSelect;
