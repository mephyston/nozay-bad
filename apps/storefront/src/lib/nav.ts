import type { SearchableNavGroup } from '@nba/ui';
import type { SessionPayload } from './auth';

/**
 * Le menu de l'espace adhérent, tel que la recherche le connaît.
 *
 * Les cinq onglets et les entrées de « Mon compte », avec les mots qu'on tape quand
 * on ne connaît pas l'intitulé (« CSE », « facture », « push »). Filtré comme les
 * écrans qui les affichent : par les fonctionnalités du club, et par ce que le
 * profil actif a le droit de voir. Les icônes sont des noms Lucide, résolus par la
 * barre qui les rend.
 */
export interface StorefrontNavContext {
  features: Partial<Record<string, boolean>>;
  session: Pick<SessionPayload, 'members' | 'activeMemberId'> | null | undefined;
}

const on = (features: StorefrontNavContext['features'], key: string) => features[key] !== false;

export function licence8Of(session: StorefrontNavContext['session']): string {
  const active = session?.members.find((m) => m.id === session.activeMemberId) ?? session?.members[0];
  const digits = String(active?.licence ?? '').replace(/\D/g, '');
  return digits ? digits.padStart(8, '0') : '';
}

export function storefrontNavGroups({ features, session }: StorefrontNavContext): SearchableNavGroup[] {
  const active = session?.members.find((m) => m.id === session.activeMemberId) ?? session?.members[0];
  const licence = licence8Of(session);

  const tabs: SearchableNavGroup = {
    label: 'Espace adhérent',
    items: [
      { name: 'Accueil', icon: 'Home', href: '/', keywords: ['home', 'fil', 'annonces', 'anniversaires'] },
      { name: 'Actualités', icon: 'Newspaper', href: '/actualites', keywords: ['news', 'articles', 'annonces', 'jeunes', 'publication'] },
      { name: 'Calendrier', icon: 'CalendarDays', href: '/agenda', keywords: ['agenda', 'evenement', 'tournoi', 'date', 'inscription', 'soiree'] },
      ...(on(features, 'shop')
        ? [{ name: 'Boutique', icon: 'ShoppingCart', href: '/boutique', keywords: ['commande', 'volants', 'cordage', 'maillot', 'acheter', 'prix'] }]
        : []),
      ...(on(features, 'teams')
        ? [
            { name: 'Mon club', icon: 'Trophy', href: '/equipes', keywords: ['equipes', 'interclubs', 'championnat', 'joueurs', 'annuaire', 'classement'] },
            { name: 'Joueurs', icon: 'Users', href: '/equipes?vue=joueurs', keywords: ['annuaire', 'adherents', 'membres', 'licence', 'classement'] }
          ]
        : [])
    ]
  };

  const account: SearchableNavGroup = {
    label: 'Mon compte',
    items: [
      { name: 'Mon compte', icon: 'User', href: '/mon-compte', keywords: ['profil', 'compte', 'cotisation', 'commandes', 'historique'] },
      ...(licence ? [{ name: 'Ma fiche', icon: 'IdCard', href: `/adherents/${licence}`, keywords: ['profil', 'photo', 'portrait', 'licence', 'classement'] }] : []),
      { name: 'Ma cotisation', icon: 'Wallet', href: '/mon-compte#cotisation', keywords: ['paiement', 'licence', 'adhesion', 'reglement', 'facture'] },
      { name: 'Historique de commandes', icon: 'History', href: '/mon-compte#commandes', keywords: ['commandes', 'boutique', 'achats', 'suivi'] },
      ...(on(features, 'attestations')
        ? [{ name: 'Mon attestation CSE', icon: 'FileText', href: '/attestation', keywords: ['cse', 'attestation', 'employeur', 'remboursement', 'pdf', 'justificatif'] }]
        : []),
      ...(on(features, 'push')
        ? [{ name: 'Notifications', icon: 'Bell', href: '/notifications', keywords: ['push', 'alertes', 'rappels', 'messages', 'preferences'] }]
        : []),
      ...(active?.expenseAuthorized && on(features, 'expenses')
        ? [{ name: 'Notes de frais', icon: 'Receipt', href: '/note-de-frais', keywords: ['frais', 'depense', 'remboursement', 'benevole'] }]
        : [])
    ]
  };

  return [tabs, account];
}
