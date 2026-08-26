export class Category {
  id: number;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode?: string | null;
  expenseCode?: string | null;
  receiptAccountClassId?: number | null;
  expenseAccountClassId?: number | null;
  active: boolean;

  constructor(data: {
    id: number;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses?: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
    receiptAccountClassId?: number | null;
    expenseAccountClassId?: number | null;
    active?: boolean;
  }) {
    this.id = data.id;
    this.adminLabel = data.adminLabel;
    this.adherentLabel = data.adherentLabel;
    this.hideInExpenses = !!data.hideInExpenses;
    this.receiptCode = data.receiptCode ?? null;
    this.expenseCode = data.expenseCode ?? null;
    this.receiptAccountClassId = data.receiptAccountClassId ?? null;
    this.expenseAccountClassId = data.expenseAccountClassId ?? null;
    this.active = data.active ?? true;
  }

  canBeExpense(): boolean {
    return !this.hideInExpenses;
  }
}

export interface CategoryLike {
  id: number;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses?: boolean;
  receiptCode?: string | null;
  expenseCode?: string | null;
  receiptAccountClassId?: number | null;
  expenseAccountClassId?: number | null;
  active?: boolean;
}

export interface CategoryMap {
  adhesions: number;
  sponsoring: number;
  subventions: number;
  actionsJeunes: number;
  tournoisSenior: number;
  buvette: number;
  cordage: number;
  volants: number;
  salaires: number;
  materiel: number;
  licences: number;
  championnats: number;
  stagesFormations: number;
  fonctionnement: number;
}

export function resolveCategoryMap(categories: CategoryLike[]): CategoryMap {
  const findId = (keywords: string[], keyName: string): number => {
    const matched = categories.find(c => {
      const admin = (c.adminLabel || '').toLowerCase();
      const adherent = (c.adherentLabel || '').toLowerCase();
      return keywords.some(k => admin.includes(k) || adherent.includes(k));
    });
    if (matched) return matched.id;
    console.warn(`[resolveCategoryMap] Fallback: Catégorie pour "${keyName}" non trouvée.`);
    return categories[0]?.id ?? 1;
  };

  return {
    adhesions: findId(['adhésion', 'adhesion', 'cotisation', 'inscription'], 'adhesions'),
    sponsoring: findId(['sponsoring', 'partenariat'], 'sponsoring'),
    subventions: findId(['subvention'], 'subventions'),
    actionsJeunes: findId(['jeune', 'jeunes', 'activités jeunes'], 'actionsJeunes'),
    tournoisSenior: findId(['tournois senior', 'tournoi senior', 'tournois', 'tournoi', 'hivers', 'eté', 'dep'], 'tournoisSenior'),
    buvette: findId(['buvette', 'buvettes', 'événement', 'evenement'], 'buvette'),
    cordage: findId(['cordage', 'cordages'], 'cordage'),
    volants: findId(['volant', 'volants'], 'volants'),
    salaires: findId(['salaire', 'salaires', 'charges'], 'salaires'),
    materiel: findId(['matériel', 'materiel'], 'materiel'),
    licences: findId(['licence', 'licences', 'ffbad', 'fédération'], 'licences'),
    championnats: findId(['championnat', 'championnats', 'interclub', 'interclubs'], 'championnats'),
    stagesFormations: findId(['stage', 'stages', 'formation', 'formations'], 'stagesFormations'),
    /*
     * Plus de `virementsInternes` ici.
     *
     * Un virement interne n'est pas une imputation analytique : c'est un mouvement entre deux
     * comptes du club, désormais écrit en deux jambes sans catégorie. Le garder dans cette carte
     * était doublement risqué — `findId` retombe sur `categories[0]` quand rien ne correspond,
     * c'est-à-dire sur « Adhésions & Inscriptions » avec le seed en place : renommer la catégorie
     * aurait fait suggérer des cotisations à la place des virements.
     */
    fonctionnement: findId(['fonctionnement', 'administratif', 'bureau'], 'fonctionnement')
  };
}

export function resolveProductAccountingCategory(
  productCategory: string,
  categories: CategoryLike[]
): number {
  let matched: CategoryLike | undefined;

  if (productCategory === 'shuttlecock') {
    matched = categories.find(c =>
      (c.adminLabel || '').toLowerCase().includes('volant') ||
      (c.adherentLabel || '').toLowerCase().includes('volant')
    );
  } else if (productCategory === 'string') {
    matched = categories.find(c =>
      (c.adminLabel || '').toLowerCase().includes('cordage') ||
      (c.adherentLabel || '').toLowerCase().includes('cordage')
    );
  } else {
    matched = categories.find(c =>
      (c.adminLabel || '').toLowerCase().includes('matériel') ||
      (c.adminLabel || '').toLowerCase().includes('materiel') ||
      (c.adherentLabel || '').toLowerCase().includes('matériel') ||
      (c.adherentLabel || '').toLowerCase().includes('materiel')
    );
  }

  if (matched) {
    return matched.id;
  }

  console.warn(`[resolveProductAccountingCategory] Fallback: Aucune catégorie comptable trouvée pour le produit "${productCategory}".`);
  return categories[0]?.id ?? 1;
}
