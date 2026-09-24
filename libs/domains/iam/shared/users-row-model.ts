import { ROLE_LABELS, type Role } from './roles';

/**
 * Projection d'un accès en rangée de liste, et filtrage de la liste.
 *
 * Le tableau et la vue mobile se recopiaient : quatre colonnes d'un côté, une carte
 * faite main de l'autre, avec deux boutons pleine largeur dont un rouge aussi
 * accessible que l'autre. Les deux tirent désormais leurs libellés et leurs tons d'ici,
 * ce qui les empêche de diverger.
 */
export type AccesLu = {
  id: number;
  name?: string | null;
  email: string;
  roles?: string[] | null;
};

export type LigneDAcces = {
  cle: number;
  titre: string;
  sousTitre: string;
  valeur: string;
  /** Un accès sans rôle n'ouvre rien : c'est l'exception, et elle se signale. */
  exception: boolean;
};

/** Minuscules, sans accents : personne ne tape les accents dans un champ de recherche. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function libelleDeRole(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

/**
 * Le ton d'une pastille de rôle.
 *
 * Le super administrateur en rouge : il peut tout, y compris usurper un compte, et
 * c'est le seul rôle dont l'attribution demande qu'on s'arrête. L'accès minimal en
 * contour, parce qu'il ne donne rien.
 */
export function tonDeRole(role: string): 'destructive' | 'outline' | 'secondary' {
  if (role === 'super_admin') return 'destructive';
  if (role === 'membre') return 'outline';
  return 'secondary';
}

/**
 * Ce que la rangée dit à droite : les rôles, ou leur absence.
 *
 * Deux rôles au plus sont nommés ; au-delà, le compte prend le relais. Trois libellés
 * comme « Trésorier·ère » mis bout à bout ne tiennent pas sur la moitié d'un téléphone,
 * et tronqués au milieu ils ne disent plus rien.
 */
export function resumeDesRoles(roles: string[] | null | undefined): string {
  const liste = roles ?? [];
  if (liste.length === 0) return 'Aucun rôle';
  if (liste.length <= 2) return liste.map(libelleDeRole).join(', ');
  return `${libelleDeRole(liste[0])} +${liste.length - 1}`;
}

export function ligneDAcces(user: AccesLu): LigneDAcces {
  return {
    cle: user.id,
    // Un accès créé sans nom n'en a pas : l'adresse fait alors l'identité, plutôt
    // qu'une ligne vide surmontant une adresse.
    titre: user.name?.trim() || user.email,
    sousTitre: user.name?.trim() ? user.email : '',
    valeur: resumeDesRoles(user.roles),
    exception: (user.roles ?? []).length === 0
  };
}

/**
 * Les accès retenus par un terme.
 *
 * Cherche dans le nom, l'adresse et les **libellés** des rôles : on cherche
 * « trésorier », pas « tresorier » tel qu'il est stocké. Chaque mot doit se retrouver,
 * dans n'importe quel ordre.
 */
export function accesCorrespond(user: AccesLu, terme: string): boolean {
  const mots = normaliser(terme).split(' ').filter(Boolean);
  if (mots.length === 0) return true;
  const botte = normaliser(
    [user.name ?? '', user.email, ...(user.roles ?? []).map(libelleDeRole)].join(' ')
  );
  return mots.every((mot) => botte.includes(mot));
}

export function accesFiltres<T extends AccesLu>(users: T[], terme: string): T[] {
  return users.filter((u) => accesCorrespond(u, terme));
}
