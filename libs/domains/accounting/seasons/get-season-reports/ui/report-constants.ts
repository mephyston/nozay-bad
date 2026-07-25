export const defaultChargeClasses = [
  { id: 4, code: '60', label: '60 - Achats', type: 'depense' as const },
  { id: 5, code: '61', label: '61 - Services extérieurs', type: 'depense' as const },
  { id: 6, code: '62', label: '62 - Autres services extérieurs', type: 'depense' as const },
  { id: 8, code: '64', label: '64 - Charges de personnel', type: 'depense' as const },
  { id: 9, code: '65', label: '65 - Autres charges de gestion courante', type: 'depense' as const },
  { id: 10, code: '67', label: '67 - Charges exceptionnelles', type: 'depense' as const }
];

export const defaultProduitClasses = [
  { id: 1, code: '70', label: '70 - Vente de produits & prestations', type: 'recette' as const },
  { id: 2, code: '74', label: "74 - Subventions d'exploitation", type: 'recette' as const },
  { id: 3, code: '75', label: '75 - Autres produits de gestion courante', type: 'recette' as const },
  { id: 11, code: '77', label: '77 - Produits exceptionnels', type: 'recette' as const }
];
