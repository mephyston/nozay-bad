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
}
