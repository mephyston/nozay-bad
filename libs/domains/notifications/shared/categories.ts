/**
 * Catégories de notifications proposées à l'adhérent.
 *
 * Le réglage se fait par **désabonnement** : activer les notifications donne tout,
 * puis chacun décoche ce qu'il ne veut plus. L'inverse produirait des adhérents
 * abonnés qui ne reçoivent jamais rien, sans comprendre pourquoi.
 *
 * Conséquence directe : l'absence de ligne en base vaut « activé ». On n'écrit une
 * préférence que lorsqu'elle s'écarte du défaut.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: 'announcement',
    label: 'Communications du bureau',
    description: 'Actualités du club, tournois, assemblée générale.'
  },
  {
    id: 'birthday',
    label: 'Anniversaires',
    description: 'Les anniversaires des adhérents du club.'
  },
  {
    id: 'expense',
    label: 'Mes notes de frais',
    description: 'Validation ou refus de vos notes de frais.'
  },
  {
    id: 'order',
    label: 'Mes commandes boutique',
    description: 'Validation ou refus de vos commandes.'
  },
  {
    id: 'reminder',
    label: 'Relances',
    description: 'Cotisation à régler, commande en attente.'
  },
  {
    id: 'interclubs',
    label: 'Mes équipes interclubs',
    description: "Anomalie signalée sur une composition dont vous êtes capitaine."
  }
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]['id'];

export const NOTIFICATION_CATEGORY_IDS = NOTIFICATION_CATEGORIES.map((c) => c.id) as NotificationCategory[];

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORY_IDS as string[]).includes(value);
}

export function categoryLabel(id: string): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
