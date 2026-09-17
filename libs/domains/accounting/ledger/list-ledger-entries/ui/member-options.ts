import type { ComboboxItem, SeasonLike } from '@nba/ui';

/**
 * Une adhésion telle que l'annuaire la rend, marquée de son exercice.
 *
 * `ledger_entries.member_id` désigne une **adhésion**, pas une personne : la même personne
 * a un identifiant par saison. Le relais charge l'annuaire de tous les exercices ouverts et
 * pose `seasonCode` sur chaque adhésion, comme au rapprochement.
 */
export interface MemberLike {
  id: number | string;
  firstName: string;
  lastName: string;
  licence?: string | null;
  seasonCode: string;
}

/**
 * L'annuaire de l'exercice de rattachement, et de lui seul.
 *
 * Le formulaire du grand livre reçoit l'exercice tantôt par son identifiant (l'écran d'un
 * compte, qui le déduit de la date), tantôt par son code (le grand livre, qui reprend celui
 * qu'il affiche) : on accepte les deux formes, résolues sur la liste des saisons. Un exercice
 * inconnu rend une liste vide plutôt que l'annuaire entier — proposer l'adhésion d'un autre
 * exercice, c'est faire disparaître le règlement du dossier de l'adhérent (voir
 * `assertMembershipMatchesSeason`).
 */
export function membersForSeason<T extends MemberLike>(members: T[], seasons: SeasonLike[], target: string): T[] {
  if (!target) return [];
  const season = seasons.find((s) => s.code === target || String(s.id) === target);
  const code = season?.code ?? target;
  return members.filter((m) => m.seasonCode === code);
}

/** Les adhésions d'un exercice, prêtes pour le sélecteur, par nom. */
export function toMemberItems(members: MemberLike[]): ComboboxItem[] {
  return [...members]
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', { sensitivity: 'base' }))
    .map((m) => ({ value: String(m.id), label: `${m.lastName} ${m.firstName}`, detail: m.licence ?? undefined }));
}
