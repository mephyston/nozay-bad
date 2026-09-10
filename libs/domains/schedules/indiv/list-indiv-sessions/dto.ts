import type { VenueRow } from '../../shared/schema';
import type { IndivSessionRow } from '../../shared/indiv-schema';
import type { SlotWindow } from '../../shared/indiv';

export interface ListIndivSessionsInput {
  /** Défaut : à partir d'aujourd'hui. L'administration passe une date basse pour l'historique. */
  from?: string;
  to?: string;
  /** Imposé par la session du storefront : chaque soirée porte alors MA candidature. */
  memberId?: number;
  /**
   * Libellé du groupe d'adhésion du lecteur, imposé par la session du storefront.
   * C'est lui qui décide d'`eligible` — le domaine ne connaît pas les adhérents.
   */
  group?: string;
  /** Défaut : les soirées annulées restent visibles — le candidat doit lire pourquoi. */
  includeCancelled?: boolean;
  /** L'espace adhérent passe 1 : il ne montre que la prochaine soirée. */
  limit?: number;
}

export interface MyIndivRequest {
  preferredSlot: number | null;
  note: string | null;
  /** Le créneau attribué, ou `null`. N'a de sens qu'une fois la soirée annoncée. */
  selectedSlot: number | null;
}

export interface IndivSessionListItem extends IndivSessionRow {
  venue: VenueRow | null;
  /** Dérivés de la soirée, jamais stockés. */
  endTime: string;
  slots: SlotWindow[];
  requestCount: number;
  selectedCount: number;
  /** Ma candidature, ou `null` si je n'ai pas demandé — ce qui décide du libellé du bouton. */
  myRequest: MyIndivRequest | null;
  /**
   * Les retenus, prénom et initiale, par numéro de créneau — **seulement une fois la
   * soirée annoncée**. L'annonce est publique par nature (elle part sur le groupe
   * WhatsApp) ; avant elle, aucun nom ne sort, et jamais celui d'un non-retenu.
   */
  selectedNames: Record<number, string[]>;
}

export interface ListIndivSessionsOutput {
  sessions: IndivSessionListItem[];
  /** Le lecteur peut-il candidater ? Confort d'affichage : le refus qui compte est celui du handler. */
  eligible: boolean;
}
