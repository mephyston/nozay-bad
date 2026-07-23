# RF-[DOM]-[XXX] : [Nom de la Règle Fonctionnelle]

## 1. Description et Objectif Métier
[Description succincte de la règle fonctionnelle et de la valeur métier apportée.]

---

## 2. Domaine Fonctionnel
- **Domaine** : [ex: shop / accounting / members / expenses]
- **Agrégat / Entité clé** : [ex: Commande, Produit, Facture]
- **Statut** : [Draft | Validé | Obsolète]

---

## 3. Définition de la Règle Métier
[Explication détaillée des préconditions, règles de calcul, validations et effets de bord.]

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: [Nom de la fonctionnalité]

  Scénario: [Titre du scénario nominal]
    Étant donné [mise en situation initiale / préconditions]
    Quand [action de l'utilisateur ou événement système]
    Alors [résultat attendu / nouvel état du système]

  Scénario: [Titre d'un cas d'erreur / d'exception]
    Étant donné [mise en situation initiale]
    Quand [action déclenchant l'erreur]
    Alors [message d'erreur ou refus de l'opération]
```
