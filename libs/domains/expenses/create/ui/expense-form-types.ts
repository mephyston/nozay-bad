export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
}

export interface CategoryItem {
  id: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
}

export interface Props {
  activeSeasonId: string;
  members?: Member[];
  categories?: CategoryItem[];
  // Restreint la sélection au strict `members` fourni (foyer connecté) et désactive
  // la recherche autocomplete `/api/members-search`.
  lockToMembers?: boolean;
  // Présélectionne un adhérent (id en string) parmi `members`.
  initialMemberId?: string;
}
