export const defaultChargeClasses = [
  { code: '60', label: '60 - Achats', type: 'depense' as const },
  { code: '61', label: '61 - Services extérieurs', type: 'depense' as const },
  { code: '62', label: '62 - Autres services extérieurs', type: 'depense' as const },
  { code: '64', label: '64 - Charges de personnel', type: 'depense' as const },
  { code: '65', label: '65 - Autres charges de gestion courante', type: 'depense' as const },
  { code: '67', label: '67 - Charges exceptionnelles', type: 'depense' as const }
];

export const defaultProduitClasses = [
  { code: '70', label: '70 - Vente de produits & prestations', type: 'recette' as const },
  { code: '74', label: "74 - Subventions d'exploitation", type: 'recette' as const },
  { code: '75', label: '75 - Autres produits de gestion courante', type: 'recette' as const },
  { code: '77', label: '77 - Produits exceptionnels', type: 'recette' as const }
];
