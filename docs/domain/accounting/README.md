# Domaine Métier : Comptabilité

Grand livre, rapprochement bancaire, remises de chèques, factures, exercices et budget du club. Les règles fonctionnelles sont dans `rules/`.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Pôle** | Regroupement de catégories pour le bilan recettes / dépenses du tableau de bord. Défini et ordonné par le bureau. Une catégorie a au plus un pôle. | `Entity` (Pôle Compétition, Pôle Jeunes) |
| **Rubrique** | Regroupement de catégories pour « Où va votre cotisation ». Ce sont les postes montrés aux adhérents. Une catégorie a au plus une rubrique, et les catégories sans rubrique comptent dans « Autres ». | `Entity` (Encadrement, Volants et matériel) |
| **Rubrique des cotisations** | La seule rubrique dont le solde est rapporté au coût d'un adhérent. | `Flag` |
| **Coût d'un adhérent** | Total des charges de la saison source, divisé par son effectif (dossiers suspendus exclus). Voir RF-ACC-002. | `Montant` (385 €) |
