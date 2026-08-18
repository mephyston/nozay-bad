import type { ScheduledNotificationView } from '@nba/notifications-api';

/**
 * Registre des notifications automatiques, affiché en consultation dans l'admin.
 *
 * Il vit dans l'app et non dans le domaine notifications : les entrées décrivent des
 * envois des domaines adhérents, boutique, notes de frais et interclubs, que le
 * domaine notifications — resté feuille — ne connaît pas.
 *
 * **Toute nouvelle branche d'envoi dans `scheduled.ts`, et tout nouvel appel métier à
 * `notifyContacts`/`enqueueNotification`, doit avoir son entrée ici** : ce registre est
 * la seule vue que le bureau a de ce qui part tout seul. `scheduled-registry.test.ts`
 * vérifie la correspondance avec les sources émises par le cron.
 *
 * Les horaires sont exprimés en heure de Paris ; les crons du Worker tournent en UTC
 * (7h UTC = 8h ou 9h à Paris selon la saison), d'où les libellés « vers ».
 */
export type RegistryEnv = {
  PUSH_REMINDERS_ENABLED?: string;
  PUSH_BIRTHDAYS_ENABLED?: string;
  PUSH_RANKING_REMINDERS_ENABLED?: string;
  PUSH_LINEUP_REMINDERS_ENABLED?: string;
};

export function listScheduledNotifications(env: RegistryEnv): ScheduledNotificationView[] {
  const on = (flag: keyof RegistryEnv) => env?.[flag] === 'true';

  return [
    // ── Récurrentes (cron du Worker API) ─────────────────────────────────────
    {
      id: 'birthday:daily',
      title: 'Anniversaire(s) du jour',
      body: 'Bon anniversaire à … ! Annonce à tout le club quand au moins un adhérent est concerné.',
      schedule: 'Tous les jours vers 8-9h',
      trigger: 'cron',
      category: 'birthday',
      enabled: on('PUSH_BIRTHDAYS_ENABLED'),
      flag: 'PUSH_BIRTHDAYS_ENABLED'
    },
    {
      id: 'reminder:unpaid',
      title: 'Cotisation en attente',
      body: "Votre cotisation n'est pas encore soldée. Envoyée aux foyers dont la cotisation reste due.",
      schedule: 'Le lundi vers 9-10h',
      trigger: 'cron',
      category: 'reminder',
      enabled: on('PUSH_REMINDERS_ENABLED'),
      flag: 'PUSH_REMINDERS_ENABLED'
    },
    {
      id: 'reminder:order-awaiting-payment',
      title: 'Commande à régler',
      body: 'Une commande boutique validée attend votre règlement. Commandes validées depuis plus de 7 jours.',
      schedule: 'Le lundi vers 9-10h',
      trigger: 'cron',
      category: 'reminder',
      enabled: on('PUSH_REMINDERS_ENABLED'),
      flag: 'PUSH_REMINDERS_ENABLED'
    },
    {
      id: 'teams:ranking-reminder',
      title: 'Classements à mettre à jour',
      body: "Export Poona puis import dans l'admin avant une journée d'interclubs régional. Envoyée aux fonctions du club (bureau, CA, entraîneurs).",
      schedule: "Le jeudi précédant chaque journée d'interclubs régional",
      trigger: 'cron',
      category: 'interclubs',
      enabled: on('PUSH_RANKING_REMINDERS_ENABLED'),
      flag: 'PUSH_RANKING_REMINDERS_ENABLED'
    },
    {
      id: 'teams:lineup-reminder',
      title: 'Composition à valider',
      body: "Rappel aux capitaines et vice-capitaines tant que la composition n'est pas validée — uniquement dans les championnats où le club aligne plusieurs équipes (risque de valeur d'équipe).",
      schedule: "Chaque jour de la veille de la journée jusqu'à la première rencontre du club",
      trigger: 'cron',
      category: 'interclubs',
      enabled: on('PUSH_LINEUP_REMINDERS_ENABLED'),
      flag: 'PUSH_LINEUP_REMINDERS_ENABLED'
    },

    // ── Événementielles (déclenchées par une action métier, toujours actives) ─
    {
      id: 'teams:lineup',
      title: '« Équipe » — vous jouez J… / vous n’êtes pas aligné',
      body: "Convocation des joueurs retenus et information des non-retenus de l'effectif.",
      schedule: "À la validation d'une composition (ou modification d'une composition validée)",
      trigger: 'event',
      category: 'interclubs',
      enabled: true,
      flag: null
    },
    {
      id: 'teams:value-overflow',
      title: '« Équipe » — journée à revoir (valeur d’équipe)',
      body: "Dépassement de la valeur de l'équipe du dessus détecté : les capitaines et vices des deux équipes concernées sont prévenus.",
      schedule: "À la validation d'une composition présentant un dépassement de valeur",
      trigger: 'event',
      category: 'interclubs',
      enabled: true,
      flag: null
    },
    {
      id: 'teams:day-control',
      title: '« Équipe » — journée à revoir',
      body: "Constat envoyé par le coach depuis le contrôle des journées : erreurs de composition et dépassements de valeur.",
      schedule: 'À la demande, depuis « Équipes → Contrôle des journées »',
      trigger: 'event',
      category: 'interclubs',
      enabled: true,
      flag: null
    },
    {
      id: 'expense:approved',
      title: 'Note de frais validée',
      body: 'Votre note de frais de … € a été validée.',
      schedule: "À la validation d'une note de frais",
      trigger: 'event',
      category: 'expense',
      enabled: true,
      flag: null
    },
    {
      id: 'expense:rejected',
      title: 'Note de frais refusée',
      body: 'Votre note de frais a été refusée. Rapprochez-vous du bureau pour en connaître le motif.',
      schedule: "Au refus d'une note de frais",
      trigger: 'event',
      category: 'expense',
      enabled: true,
      flag: null
    },
    {
      id: 'order:awaiting-payment',
      title: 'Commande en attente de paiement',
      body: 'Votre commande … est validée. Il reste … € à régler.',
      schedule: "À la validation d'une commande boutique",
      trigger: 'event',
      category: 'order',
      enabled: true,
      flag: null
    },
    {
      id: 'order:paid',
      title: 'Commande payée',
      body: 'Le règlement de votre commande … est enregistré.',
      schedule: "À l'encaissement d'une commande boutique",
      trigger: 'event',
      category: 'order',
      enabled: true,
      flag: null
    },
    {
      id: 'order:rejected',
      title: 'Commande refusée',
      body: "Votre commande boutique n'a pas été retenue.",
      schedule: "Au refus d'une commande boutique",
      trigger: 'event',
      category: 'order',
      enabled: true,
      flag: null
    },
    {
      id: 'order:cancelled',
      title: 'Commande annulée',
      body: 'Votre commande boutique a été annulée faute de règlement.',
      schedule: "À l'annulation d'une commande boutique",
      trigger: 'event',
      category: 'order',
      enabled: true,
      flag: null
    },
    {
      id: 'post:published',
      title: "Titre de l'annonce",
      body: "Chapô ou début de l'annonce publiée sur le site.",
      schedule: "À l'envoi manuel d'une annonce publiée (« Notifier »)",
      trigger: 'event',
      category: 'announcement',
      enabled: true,
      flag: null
    }
  ];
}
