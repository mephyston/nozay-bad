# RF-BUV-003 : Session de caisse et comptabilité

## 1. Description et Objectif Métier

Une session de caisse suit un tiroir d'espèces de l'ouverture à la clôture. La clôture compare ce qui a été encaissé à ce qui est constaté, puis pose une synthèse en comptabilité : le trésorier n'a pas une écriture par café.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette (écritures posées par le domaine accounting, dans le lot de la clôture)
- **Agrégat / Entité clé** : Session de caisse
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Une session ouverte à la fois.** Elle correspond à un tiroir d'espèces. Plusieurs bénévoles y encaissent, chacun depuis son téléphone, et chaque vente garde le nom de son auteur.

**Ouverture et clôture au bureau.** Elles se font depuis l'administration, avec leur propre droit : elles engagent le comptage et la comptabilité. La caisse ne peut ni ouvrir ni clôturer, et affiche « fermée » sans session.

**Ouverture.** Le responsable saisit le fond de caisse compté. La session ne s'ouvre que si les comptes et catégories de la buvette sont réglés.

**Clôture.** Le responsable compte les espèces. L'écran affiche les espèces théoriques, l'écart de caisse, le total CB et le total débité sur les cartes. La clôture est refusée s'il reste une vente en cours, y compris « à vérifier ».

**Contrôle CB.** Le total CB de la session est rapproché des transactions SumUp portant ses identifiants. Une différence est signalée à la clôture.

**Date comptable.** Les écritures portent la date d'ouverture de la session, et l'exercice se déduit de cette date.

**Synthèse comptable.** Une session clôturée pose :

| Fait | Écriture |
|---|---|
| Articles payés en espèces | Recette sur le compte de caisse, par catégorie |
| Articles payés en CB | Recette sur le compte SumUp, par catégorie |
| Articles payés par carte | Recette sur le compte de dette de cartes, par catégorie |
| Recharge en espèces | Virement du compte de dette vers la caisse |
| Recharge en CB | Virement du compte de dette vers le compte SumUp |
| Remboursement de solde | Virement de la caisse vers le compte de dette |
| Écart de caisse | Recette ou dépense dans la catégorie réglée pour les écarts |

**Une recharge n'est pas une recette.** La recette naît à la consommation.

**Compte SumUp.** Il porte ce que SumUp doit au club. Le virement reçu en banque le solde, et la commission est enregistrée en dépense.

**Une session clôturée ne se rouvre pas.** Une erreur se corrige par une régularisation (RF-BUV-002).

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Session de caisse

  Scénario: Clôture sans écart
    Étant donné un fond de caisse de 50 € et 30 € encaissés en espèces
    Quand le responsable compte 80 €
    Alors l'écart de caisse est de 0 €
    Et la synthèse est posée en comptabilité

  Scénario: Clôture avec un écart
    Étant donné des espèces théoriques de 80 €
    Quand le responsable compte 78 €
    Alors un écart de -2 € est affiché
    Et il est enregistré en dépense dans la catégorie des écarts

  Scénario: Une vente en cours empêche la clôture
    Étant donné une session avec une vente "à vérifier"
    Quand le responsable clôture
    Alors la clôture est refusée et la vente est désignée

  Scénario: Une recharge ne compte pas en recette
    Étant donné une session avec une recharge de 20 € en espèces et aucune vente d'article
    Quand la session est clôturée
    Alors aucune recette n'est posée
    Et un virement de 20 € va du compte de dette vers la caisse

  Scénario: La consommation devient une recette
    Étant donné une session avec un café à 1 € payé par carte
    Quand la session est clôturée
    Alors une recette de 1 € est posée sur le compte de dette de cartes
```
