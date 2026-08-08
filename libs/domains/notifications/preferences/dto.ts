import type { NotificationCategory } from '../shared/categories';

export interface CategoryPreference {
  id: NotificationCategory;
  label: string;
  description: string;
  enabled: boolean;
}

export interface UpdatePreferencesInput {
  email: string;
  /** Catégories explicitement coupées. Toute catégorie absente redevient active. */
  disabled: string[];
}
