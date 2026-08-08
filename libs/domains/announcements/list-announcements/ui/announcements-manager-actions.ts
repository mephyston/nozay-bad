import { uiConfirm } from '@nba/ui';
import type { Announcement } from './announcements-manager-types';

export interface AnnouncementFormValues {
  editingId: number | null;
  title: string;
  bodyHtml: string;
  status: 'draft' | 'published';
  /** Case « Prévenir les adhérents », proposée uniquement à qui peut diffuser. */
  notify: boolean;
  /** Vrai si l'annonce en cours d'édition a déjà été diffusée. */
  alreadyNotified: boolean;
}

/** Vrai si le texte riche ne contient aucun caractère visible. */
function isBlank(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

export function validateAnnouncement(values: AnnouncementFormValues): string | null {
  if (!values.title.trim()) return "Le titre de l'annonce est requis.";
  if (values.title.trim().length > 200) return 'Le titre ne doit pas dépasser 200 caractères.';
  if (isBlank(values.bodyHtml)) return "Le texte de l'annonce est requis.";
  return null;
}

async function post(payload: Record<string, unknown>, fallbackError: string): Promise<unknown> {
  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error((await res.text()) || fallbackError);
  return res.json().catch(() => null);
}

/**
 * Enregistre l'annonce, puis la diffuse si l'auteur l'a demandé.
 *
 * Deux appels distincts : rédiger et diffuser relèvent de deux permissions différentes,
 * donc de deux routes différentes. Ils ne sont pas atomiques, et n'ont pas à l'être —
 * la diffusion est idempotente côté serveur et reste rejouable depuis la liste si le
 * second appel échoue. Le texte rédigé, lui, n'est jamais perdu.
 */
export async function submitAnnouncement(values: AnnouncementFormValues): Promise<void> {
  const payload = values.editingId
    ? {
        action: 'update',
        id: values.editingId,
        title: values.title.trim(),
        bodyHtml: values.bodyHtml,
        status: values.status
      }
    : {
        action: 'create',
        title: values.title.trim(),
        bodyHtml: values.bodyHtml,
        status: values.status
      };

  const saved = (await post(payload, "Erreur lors de l'enregistrement.")) as
    | { data?: { id?: number } }
    | null;

  const shouldNotify = values.notify && values.status === 'published' && !values.alreadyNotified;
  if (!shouldNotify) return;

  const id = values.editingId ?? saved?.data?.id;
  if (!id) throw new Error("Annonce enregistrée, mais sa diffusion n'a pas pu être lancée.");

  await post({ action: 'notify', id }, "Annonce enregistrée, mais la diffusion a échoué.");
}

/**
 * Bascule publiée ↔ brouillon depuis la liste, sans rouvrir le formulaire.
 *
 * Retirer une annonce de la vue des adhérents est le geste d'urgence — une date
 * erronée, un tournoi annulé : il doit tenir en deux clics. Le titre et le texte sont
 * renvoyés inchangés, la route de modification étant la seule à porter le statut.
 */
export async function toggleAnnouncementStatus(announcement: Announcement): Promise<'draft' | 'published'> {
  const next = announcement.status === 'published' ? 'draft' : 'published';

  if (next === 'draft') {
    const confirmed = await uiConfirm(
      `Retirer « ${announcement.title} » de l'espace adhérent ? Elle repassera en brouillon et ne sera plus visible.`
    );
    if (!confirmed) return announcement.status;
  }

  await post(
    {
      action: 'update',
      id: announcement.id,
      title: announcement.title,
      bodyHtml: announcement.bodyHtml,
      status: next
    },
    'Impossible de changer le statut de cette annonce.'
  );
  return next;
}

export async function notifyAnnouncement(announcement: Announcement): Promise<boolean> {
  const confirmed = await uiConfirm(
    `Envoyer une notification à tous les adhérents abonnés pour « ${announcement.title} » ? Cette diffusion n'a lieu qu'une fois.`
  );
  if (!confirmed) return false;

  await post({ action: 'notify', id: announcement.id }, 'Impossible de diffuser cette annonce.');
  return true;
}

export async function deleteAnnouncement(announcement: Announcement): Promise<boolean> {
  const confirmed = await uiConfirm(`Supprimer définitivement l'annonce « ${announcement.title} » ?`);
  if (!confirmed) return false;

  await post({ action: 'delete', id: announcement.id }, 'Impossible de supprimer cette annonce.');
  return true;
}
