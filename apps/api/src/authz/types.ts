import type { Permission } from '@nba/iam';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteRule {
  method: HttpMethod;
  /** Motif Hono complet, tel qu'il apparaît dans `app.routes`. */
  path: string;
  /**
   * Permission exigée d'un utilisateur.
   * `null` = tout compte d'administration existant suffit, quel que soit son rôle.
   */
  permission: Permission | null;
  /**
   * Route appelable par un Worker de service (le storefront), qui agit pour un
   * adhérent et non pour un compte d'administration. À n'accorder qu'aux routes
   * réellement appelées par le storefront : c'est un contournement du contrôle par
   * rôle, borné par le fait que le storefront filtre lui-même sur la session.
   */
  service?: true;
  /**
   * Route dont c'est précisément le rôle de répondre pour une adresse sans compte.
   *
   * Le refus par défaut d'un acteur inconnu est la bonne règle partout ailleurs,
   * mais il rendait `/iam/me` inatteignable : le gestionnaire qui crée le tout
   * premier administrateur ne s'exécutait jamais, et sur une base vierge
   * l'application se serait verrouillée définitivement. Le message « compte non
   * configuré » l'était tout autant.
   *
   * L'exemption ne porte que sur l'*existence* du compte : la permission éventuelle
   * de la route reste exigée, et le gestionnaire décide ensuite quoi répondre.
   */
  allowUnknownActor?: true;
}
