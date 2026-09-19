# RF-SHO-004 : Déclinaisons, image et suppression d'un produit

## 1. Description et Objectif Métier
Permettre au bureau de tenir un catalogue lisible — un maillot en neuf tailles est **un** produit, pas neuf — et de l'illustrer, tout en gardant l'historique des commandes intact : un produit commandé ne disparaît jamais, un produit créé par erreur peut disparaître.

---

## 2. Domaine Fonctionnel
- **Domaine** : `shop`
- **Agrégat / Entité clé** : `Produit` / `Déclinaison`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Déclinaisons
1. Une **déclinaison** est un produit rattaché à un parent et distingué par un **libellé obligatoire** (taille, couleur…). Elle porte son propre prix, son stock et son état actif.
2. Un seul niveau : le parent d'une déclinaison n'est jamais lui-même une déclinaison, et un produit qui a des déclinaisons ne peut pas en devenir une.
3. Le **nom** et la **catégorie** d'une déclinaison sont ceux du parent, recopiés à l'écriture et répercutés à chaque modification du parent. La description et l'image ne se portent que sur le parent.
4. Un produit qui a des déclinaisons — actives ou non — **ne se commande pas lui-même** : ce sont ses déclinaisons que la commande référence. Partout où une commande est lue (historique, notifications, libellé comptable), le produit s'affiche sous son nom composé : « Maillot du club — L ».
5. Désactiver le parent retire toutes ses déclinaisons de la boutique ; les déclinaisons sont triées dans l'ordre naturel de leurs libellés (XS, S, M, L… ; 10 ans avant 12 ans).

### Catégorie et image
6. La catégorie d'un produit se modifie à tout moment ; le changement suit sur ses déclinaisons.
7. L'image est déposée réduite (800 px, WebP quand le service d'images est disponible, sinon l'original), sous une clé adressée par le contenu de la médiathèque, et servie par le site public. Retirer l'image ne supprime pas l'objet : un autre produit peut le partager.

### Suppression
8. Un produit se supprime **uniquement** s'il n'a jamais été commandé et n'a aucune déclinaison. Sinon, il se désactive.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Déclinaisons et suppression d'un produit

  Scénario: Décliner un produit en tailles
    Étant donné un produit "Maillot du club" dans la catégorie "Textile"
    Quand l'administrateur ajoute une déclinaison de libellé "L" à 12,00 €
    Alors la déclinaison porte le nom "Maillot du club" et la catégorie "Textile"
    Et la boutique affiche une seule carte "Maillot du club" proposant "L"

  Scénario: Refus d'une déclinaison sans libellé
    Étant donné un produit "Maillot du club"
    Quand l'administrateur ajoute une déclinaison sans libellé
    Alors l'enregistrement est refusé avec un message demandant le libellé

  Scénario: Changement de catégorie répercuté
    Étant donné un produit "Maillot du club" dans "Volants" avec une déclinaison "L"
    Quand l'administrateur change sa catégorie pour "Textile"
    Alors la déclinaison "L" est elle aussi dans "Textile"

  Scénario: Commande d'une déclinaison
    Étant donné une déclinaison "L" du produit "Maillot du club"
    Quand un adhérent la commande depuis la boutique
    Alors la commande référence la déclinaison
    Et son historique affiche "Maillot du club — L"

  Scénario: Suppression d'un produit jamais commandé
    Étant donné un produit "Maillot homme L" créé par erreur dans "Volants", sans commande
    Quand l'administrateur le supprime
    Alors le produit n'existe plus

  Scénario: Refus de supprimer un produit commandé
    Étant donné un produit "Yonex BG65" référencé par six commandes
    Quand l'administrateur tente de le supprimer
    Alors la suppression est refusée et l'application propose de le désactiver
```
