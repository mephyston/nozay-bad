# RF-ACC-002 : Où va la cotisation, pôles et rubriques

## 1. Description et Objectif Métier
Montrer aux adhérents comment leur cotisation est employée (encadrement, licences, volants…) et que, sans les stages, la buvette, les tournois et les subventions, le club ne tiendrait pas avec les seules cotisations. Le même rangement des catégories sert le bilan des pôles du tableau de bord, qui se reconnaissait jusqu'ici à des mots du libellé.

---

## 2. Domaine Fonctionnel
- **Domaine** : accounting
- **Agrégat / Entité clé** : Catégorie comptable, regroupement (pôle ou rubrique)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Regroupements.** Le bureau définit des pôles et des rubriques, chacun avec un libellé unique dans sa famille et un ordre. Chaque catégorie porte au plus un pôle et au plus une rubrique. Une seule rubrique désigne les **cotisations**. Supprimer un regroupement en retire ses catégories, sans les supprimer.

**Bilan des pôles.** Recettes et dépenses de la saison affichée, par pôle et par catégorie. Une catégorie sans pôle n'entre dans aucun bilan.

**Source des chiffres de « Où va votre cotisation »**, dans cet ordre :
1. le budget de la saison, s'il porte au moins un montant ;
2. sinon le réalisé de la saison précédente (par date de début) ;
3. sinon le réalisé de la saison en cours, signalé comme partiel.

L'effectif est celui de la saison source, dossiers suspendus exclus.

**Calcul.** Chaque rubrique est ramenée à son solde (recettes − dépenses). Solde négatif : c'est une charge. Solde positif : c'est une ressource. La rubrique des cotisations est toujours une ressource. Les catégories sans rubrique se cumulent dans « Autres ». Les virements internes sont exclus.

- Coût d'un adhérent = total des charges ÷ effectif.
- Cotisation moyenne = cotisations ÷ effectif.
- Manque par adhérent = coût − cotisation moyenne, plancher à 0.
- Pour un adhérent dont la cotisation due est connue, chaque charge est montrée au prorata de sa part : « vos 150 € servent à… ».

**Diffusion.** Le bureau voit l'indicateur sur le tableau de bord, avec le détail par catégorie. L'espace adhérent ne l'affiche que si le club allume la fonctionnalité « Où va ma cotisation » (éteinte à l'arrivée), et seulement par rubrique.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Où va votre cotisation

  Scénario: Le budget de la saison fait foi
    Étant donné un budget 25-26 de 20 000 € de cotisations, 18 000 € de salaires, 6 000 € de volants et 4 000 € de subventions
    Et 200 adhérents
    Quand le bureau ouvre le tableau de bord
    Alors un adhérent coûte 120 €, la cotisation moyenne est de 100 €
    Et il manquerait 20 € par adhérent avec les seules cotisations

  Scénario: Sans budget, la saison précédente
    Étant donné une saison 25-26 sans budget, et 5 000 € de licences passées en 24-25 pour 50 adhérents
    Quand l'indicateur est calculé
    Alors il s'appuie sur 24-25 et les licences coûtent 100 € par adhérent

  Scénario: Une rubrique qui rapporte est une ressource
    Étant donné un tournoi à 6 000 € de recettes et 4 000 € de dépenses
    Quand l'indicateur est calculé
    Alors « Tournois » apparaît parmi les ressources pour 2 000 €

  Scénario: Une seule rubrique des cotisations
    Étant donné la rubrique « Cotisations » désignée
    Quand le bureau désigne « Adhésions jeunes »
    Alors « Cotisations » perd la désignation

  Scénario: Un pôle n'est pas une rubrique
    Quand le bureau range une catégorie dans un pôle en lui donnant l'identifiant d'une rubrique
    Alors l'écriture est refusée avec « Pôle inconnu »
```
