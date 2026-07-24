export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
}

export interface Product {
  id: number;
  name: string;
  productCategoryId: number;
  priceCents: number;
  stock: number;
  active: boolean;
}

export const paymentMethodsList = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
  { value: 'labaz', label: 'Labaz' },
  { value: 'ancv', label: 'Chèque ANCV' },
  { value: 'pass_sport', label: "Pass'Sport" },
  { value: 'ticket_loisir', label: 'Ticket Loisir' },
  { value: 'up_loisir', label: 'Up Loisir' }
];

export const categoriesList = [
  { value: 0, label: 'Toutes les catégories' },
  { value: 1, label: 'Volants' },
  { value: 2, label: 'Cordages' },
  { value: 3, label: 'Textile & Accessoires' }
];
