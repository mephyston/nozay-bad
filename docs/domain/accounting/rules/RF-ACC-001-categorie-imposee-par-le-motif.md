# RF-ACC-001 : Catégorie imposée par le motif d'une ligne de relevé

## 1. Description et Objectif Métier
L'analyse des lignes de relevé propose une catégorie comptable : des mots-clés d'abord, puis un modèle de langage qui reprend la main dès qu'un adhérent est candidat. Certains mots ne laissent pourtant aucun doute. Une vente de maillot ou un prélèvement de la ligue ne doivent pas dépendre de l'humeur du modèle.

---

## 2. Domaine Fonctionnel
- **Domaine** : accounting
- **Agrégat / Entité clé** : Ligne de relevé bancaire (suggestion d'analyse)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier
Le libellé et le mémo sont lus sans casse ni accents.

- **Textile** : « maillot », « tee-shirt », « grip », « surgrip » ou « textile » imposent la catégorie dont le libellé contient « textile » ou « maillot ». Si le motif cite aussi une adhésion ou une cotisation, rien n'est imposé : c'est une ventilation, que le trésorier décide.
- **Licences** : « Ligue d'Île-de-France (de badminton) », « Ligue IDF », « LIFB », « FFBaD » ou « Fédération française de badminton » imposent la catégorie des licences. Si le motif cite une compétition (interclubs, championnat, ICR, ICN, ICD), rien n'est imposé.
- Une catégorie imposée l'emporte sur l'heuristique et sur le modèle. Elle n'est jamais appliquée à un virement interne.
- Si le club n'a aucune catégorie active de ce nom, rien n'est imposé.

Par ailleurs, l'analyse lit le catalogue de la boutique : un montant égal au prix d'un produit (ou à 2 à 4 fois ce prix pour les volants et les cordages) désigne la catégorie comptable de ce produit.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Catégorie imposée par le motif

  Scénario: Un maillot va en textile, même si le modèle pense « cotisation »
    Étant donné une ligne créditrice « VIR SEPA MARTIN LUCAS MAILLOT » et l'adhérent Lucas Martin candidat
    Quand l'analyse s'exécute et que le modèle répond « Adhésions & Inscriptions »
    Alors la catégorie proposée est « Textiles & Accessoires »

  Scénario: Un prélèvement de la ligue va en licences
    Étant donné une ligne débitrice « PRLV SEPA LIGUE D ILE DE FRANCE DE BADMINTON »
    Quand l'analyse s'exécute
    Alors la catégorie proposée est « Licences FFBaD »

  Scénario: Cotisation et maillot dans le même virement
    Étant donné une ligne « COTISATION + MAILLOT DUPONT »
    Quand l'analyse s'exécute
    Alors aucune catégorie n'est imposée et le trésorier ventile
```
