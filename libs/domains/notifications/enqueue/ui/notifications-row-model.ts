import { Bell, CalendarClock, History, Zap } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { Tone } from '@nba/ui';
import { NOTIFICATION_CATEGORIES } from '../../shared/categories';

/**
 * Le vocabulaire des notifications.
 *
 * L'écran empilait quatre blocs de trois formes différentes — une carte-formulaire,
 * trois sections repliables, une carte à compteurs — et son dialogue d'abonnés. Les
 * libellés, les dates et les règles d'envoi vivaient dans les 537 lignes du même
 * fichier, hors d'atteinte d'un test : c'est le seul écran du domaine qui n'en avait
 * aucun.
 */

export type StatsLike = { devices: number; accounts: number; pending: number };

export type MessageLike = {
  id: number;
  title: string;
  body: string;
  target: string;
  targetDetail: string | null;
  category: string;
  source: string;
  createdAt: string | number | Date;
  sent: number;
  failed: number;
  pending: number;
};

export type AbonneLike = {
  id: number;
  email: string;
  userAgent: string | null;
  createdAt: string | number | Date;
  lastSuccessAt: string | number | Date | null;
  members: { name: string; group: string }[];
};

export type ProgrammeeLike = {
  id: string;
  title: string;
  body: string;
  schedule: string;
  trigger: 'cron' | 'event';
  category: string;
  enabled: boolean;
  flag?: string | null;
};

/* ------------------------------------------------------------------ libellés */

const CIBLES: Record<string, string> = {
  all: 'Tous les abonnés',
  unpaid: 'Cotisation non soldée',
  groups: 'Groupes',
  emails: 'Destinataires ciblés'
};

const CATEGORIES = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.id, c.label])
) as Record<string, string>;

export const libelleDeCategorie = (id: string): string => CATEGORIES[id] ?? id;

export const libelleDeCible = (m: Pick<MessageLike, 'target' | 'targetDetail'>): string =>
  `${CIBLES[m.target] ?? m.target}${m.targetDetail ? ` (${m.targetDetail})` : ''}`;

export function dateFr(value: string | number | Date): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Réduit l'agent utilisateur à un appareil reconnaissable dans une liste. */
export function appareilDe(userAgent: string | null): string {
  if (!userAgent) return 'Appareil inconnu';
  const ua = userAgent.toLowerCase();
  if (/iphone/.test(ua)) return 'iPhone';
  if (/ipad/.test(ua)) return 'iPad';
  if (/android/.test(ua)) return 'Android';
  if (/macintosh|mac os/.test(ua)) return 'Mac';
  if (/windows/.test(ua)) return 'Windows';
  return 'Autre';
}

/* ------------------------------------------------------------------ rubriques */

export type Rubrique = {
  id: 'historique' | 'abonnements' | 'programmees' | 'evenements';
  titre: string;
  sousTitre: string;
  valeur: string;
  icone: Component;
};

/**
 * L'index de l'écran.
 *
 * Quatre rubriques de même forme, chacune portant son compte à droite. Les deux
 * registres d'envois automatiques ne paraissent que s'ils existent : un club dont
 * aucune fonctionnalité programmée n'est ouverte n'a pas à lire deux rangées vides.
 *
 * Aucun titre ne reprend le mot « notifications » : la page s'appelle ainsi, et le
 * répéter trois fois débordait la barre de la feuille, où il s'affichait
 * « Notifications sur évène… ».
 */
export function rubriquesDeNotifications({
  stats,
  messages,
  programmees
}: {
  stats: StatsLike;
  messages: readonly MessageLike[];
  programmees: readonly ProgrammeeLike[];
}): Rubrique[] {
  const cron = programmees.filter((p) => p.trigger === 'cron');
  const evenements = programmees.filter((p) => p.trigger === 'event');

  const liste: Rubrique[] = [
    {
      id: 'historique',
      titre: 'Historique des envois',
      sousTitre: 'Les notifications déjà diffusées et leur distribution.',
      valeur: String(messages.length),
      icone: History
    },
    {
      id: 'abonnements',
      titre: 'Abonnements',
      /* Les appareils, et non les comptes : c'est le nombre qui décide si un envoi
         atteindra quelqu'un, et celui que la confirmation d'envoi annonce. */
      sousTitre: `${stats.accounts} compte(s) adhérent(s)${stats.pending > 0 ? ` · ${stats.pending} envoi(s) en attente` : ''}`,
      valeur: String(stats.devices),
      icone: Bell
    }
  ];

  if (cron.length > 0) {
    liste.push({
      id: 'programmees',
      titre: 'Envois programmés',
      sousTitre: 'Envois récurrents automatiques et leur fréquence.',
      valeur: String(cron.length),
      icone: CalendarClock
    });
  }
  if (evenements.length > 0) {
    liste.push({
      id: 'evenements',
      titre: 'Envois sur événement',
      sousTitre: 'Envois déclenchés par une action métier.',
      valeur: String(evenements.length),
      icone: Zap
    });
  }

  return liste;
}

/* ------------------------------------------------------------------ projections */

export type Ligne = { titre: string; sousTitre: string; valeur: string; ton: Tone };

/**
 * Projection d'un envoi passé.
 *
 * Le titre identifie, la date, la catégorie et la cible situent. La valeur est le
 * nombre d'appareils atteints — c'est la question qu'on se pose d'un envoi passé.
 * Le corps du message ne descend pas ici : deux lignes de texte sous chaque titre
 * noyaient la liste, et il se lit dans le détail.
 */
export function ligneDeMessage(m: MessageLike): Ligne {
  const origine = m.source !== 'admin' ? ` · ${m.source}` : '';
  return {
    titre: m.title,
    sousTitre: `${dateFr(m.createdAt)} · ${libelleDeCategorie(m.category)} · ${libelleDeCible(m)}${origine}`,
    valeur: String(m.sent),
    ton: m.failed > 0 ? 'destructive' : m.sent > 0 ? 'success' : 'muted'
  };
}

export type Pastille = { label: string; variant: 'secondary' | 'destructive' };

/**
 * Ce qu'un envoi signale, et rien de plus.
 *
 * « N envoyée(s) » tenait une pastille sur chaque ligne ; c'est la valeur de la
 * rangée, elle n'a pas à s'écrire deux fois. Ne restent que les écarts : ce qui
 * attend encore, ce qui a échoué.
 */
export function signalementsDEnvoi(m: MessageLike): Pastille[] {
  const liste: Pastille[] = [];
  if (m.pending > 0) liste.push({ label: `${m.pending} en attente`, variant: 'secondary' });
  if (m.failed > 0) liste.push({ label: `${m.failed} en échec`, variant: 'destructive' });
  return liste;
}

/** Projection d'un appareil abonné : qui il joint, et depuis quand. */
export function ligneDAbonne(s: AbonneLike): Ligne {
  const noms = s.members.map((m) => m.name).join(', ');
  const groupes = [...new Set(s.members.map((m) => m.group))].join(' · ');
  return {
    titre: noms || 'Compte non rattaché',
    sousTitre: groupes ? `${groupes} · ${s.email}` : s.email,
    valeur: appareilDe(s.userAgent),
    ton: s.members.length > 0 ? 'foreground' : 'muted'
  };
}

/** Projection d'un envoi automatique : ce qu'il dit, et quand il part. */
export function ligneProgrammee(e: ProgrammeeLike): Ligne {
  return {
    titre: e.title,
    sousTitre: e.schedule,
    valeur: e.trigger === 'event' ? libelleDeCategorie(e.category) : e.enabled ? 'Active' : 'Désactivée',
    ton: e.trigger === 'cron' && !e.enabled ? 'muted' : 'foreground'
  };
}

/* ------------------------------------------------------------------ envoi */

export type BrouillonDEnvoi = {
  title: string;
  body: string;
  target: 'all' | 'unpaid' | 'groups';
  selectedGroups: readonly string[];
};

/**
 * Pourquoi cet envoi ne peut pas partir, ou `null`.
 *
 * Ces trois règles vivaient au milieu de la fonction d'envoi, entre deux `fetch` et
 * un bloc `try` de cinquante lignes. La troisième est la plus utile et la moins
 * évidente : sans un seul appareil abonné, « tous les abonnés » ne joint personne,
 * et l'envoi part dans le vide sans que rien ne le dise.
 */
export function refusDEnvoi(brouillon: BrouillonDEnvoi, stats: StatsLike): string | null {
  if (!brouillon.title.trim() || !brouillon.body.trim()) {
    return 'Le titre et le message sont obligatoires.';
  }
  if (brouillon.target === 'groups' && brouillon.selectedGroups.length === 0) {
    return 'Sélectionnez au moins un groupe.';
  }
  if (brouillon.target === 'all' && stats.devices === 0) {
    return "Aucun appareil n'est abonné pour l'instant : les adhérents doivent activer les notifications depuis « Mon compte ».";
  }
  return null;
}

/** Qui recevra l'envoi, en toutes lettres — c'est ce que la confirmation annonce. */
export function audienceDe(brouillon: BrouillonDEnvoi, stats: StatsLike): string {
  if (brouillon.target === 'unpaid') return 'les foyers dont la cotisation reste due';
  if (brouillon.target === 'groups') return `les groupes : ${brouillon.selectedGroups.join(', ')}`;
  return `${stats.devices} appareil(s)`;
}
