import type { VenueRow } from '../../shared/schema';
import type { OpenPlaySessionRow } from '../../shared/open-play-schema';
import type { GuestName } from '../register-to-open-play/dto';

export interface ListOpenPlaySessionsInput {
  /** Défaut : à partir d'aujourd'hui. L'administration passe une date basse pour l'historique. */
  from?: string;
  to?: string;
  /** Imposé par la session du storefront : chaque séance porte alors MES invités. */
  memberId?: number;
  /** Imposé par la session du storefront : résout `canOpen` et `iAmOpener`. */
  licence?: string;
  /** Ce que lit le cron : les séances au seuil, sans ouvreur, dans les N jours. */
  needsOpenerWithinDays?: number;
  sessionIds?: number[];
  /** Défaut : les séances annulées restent visibles — l'adhérent doit lire pourquoi. */
  includeCancelled?: boolean;
  limit?: number;
}

export interface OpenPlaySessionListItem extends OpenPlaySessionRow {
  venue: VenueRow | null;
  /** Adhérents inscrits : ceux que le club assure sans question. */
  registrationCount: number;
  /** Invités annoncés, nommés mais non licenciés. */
  guestCount: number;
  /** Le chiffre du seuil : des raquettes, pas des licences. */
  playerCount: number;
  /** Dérivé, jamais stocké : ouverte, sans ouvreur, et le seuil est atteint. */
  needsOpener: boolean;
  /**
   * Mes invités, ou `null` si je ne suis pas inscrit.
   *
   * `null` et `[]` ne disent pas la même chose — « je ne viens pas » contre « je viens
   * seul » — et c'est cette différence qui décide du libellé du bouton.
   */
  myGuests: GuestName[] | null;
  iAmOpener: boolean;
}

export interface ListOpenPlaySessionsOutput {
  sessions: OpenPlaySessionListItem[];
  /**
   * L'adhérent interrogé figure-t-il parmi les ouvreurs de la saison ?
   *
   * Confort d'affichage uniquement : le refus qui compte est le 403 du handler de prise
   * d'ouverture. Un navigateur qui forgerait la requête se ferait refuser tout de même.
   */
  canOpen: boolean;
}
