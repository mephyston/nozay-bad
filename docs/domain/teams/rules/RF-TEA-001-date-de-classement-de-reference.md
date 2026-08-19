# RF-TEA-001 : La date de classement qui fait foi

## 1. Description et Objectif Métier

Toute valeur d'équipe se calcule à partir du classement des joueurs. Mais « le classement d'un joueur » n'existe pas dans l'absolu : il change plusieurs fois par saison, et chaque règlement désigne **une date** à laquelle le lire. Les deux comités ne la désignent pas de la même façon.

Retenir la mauvaise date produit des valeurs d'équipe plausibles et fausses — le pire des symptômes, puisque rien ne le signale. La règle existe pour que la date soit toujours choisie explicitement, jamais devinée.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `player_rankings`, `championship_settings`, `championship_days`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Historisation.** Un classement est identifié par `(licence, date ELO)`. Un import n'écrase ni ne supprime : il ajoute ou corrige la ligne de sa date. Le classement en vigueur pour un joueur à une date `D` est celui de **plus grande date ELO inférieure ou égale à `D`**. Un joueur absent d'un export récent conserve donc son classement antérieur, ce qui est exactement le comportement attendu des exports partiels de début de saison.

**Date de référence.** Elle se résout dans cet ordre :

1. Si une date est **forcée sur la journée**, elle l'emporte. Cas rare, réservé aux litiges.
2. Sinon, si le championnat arrête ses classements **pour la saison** (les trois départementaux, art. 6.1.3) : la date épinglée par le coach dans les réglages du championnat. Un reclassement obtenu en cours de saison ne la déplace pas.
3. Sinon, le championnat les arrête **par journée** (le régional, art. 4.4.2) : le **jeudi précédant la semaine** de la journée, soit le lundi de la journée moins quatre jours.
4. À défaut, il n'y a **pas** de date de référence, et aucune valeur d'équipe n'est calculable.

**Le cas 4 ne dégrade jamais vers « le classement le plus récent ».** Ce repli produirait des valeurs d'apparence normale sur une base que le règlement rejette.

**La politique n'est pas un choix.** Elle vient du règlement et vit en code. L'écran l'affiche ; il ne la propose pas. Épingler une date sur un championnat qui se résout par journée est refusé, plutôt qu'accepté en silence pour un réglage qui ne serait jamais lu.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Date de classement de référence

  Scénario: Le départemental garde sa date toute la saison
    Étant donné que les classements du 13/08/2026 et du 10/12/2026 sont importés
    Et que la date de référence du championnat départemental mixte est le 13/08/2026
    Quand on calcule la valeur d'une équipe sur une journée de février 2027
    Alors les classements retenus sont ceux du 13/08/2026

  Scénario: Le régional suit la journée
    Étant donné que les classements du 13/08/2026 et du 08/10/2026 sont importés
    Et qu'une journée de régional commence le lundi 12/10/2026
    Quand on calcule la valeur de l'équipe pour cette journée
    Alors la date de référence est le jeudi 08/10/2026
    Et les classements retenus sont ceux du 08/10/2026

  Scénario: Un joueur absent d'un export partiel garde son classement
    Étant donné que Camille est classée D9 au 13/08/2026
    Et qu'un export du 10/12/2026 ne contient pas Camille
    Quand on lit le classement de Camille au 15/01/2027
    Alors il vaut D9

  Scénario: Aucune date épinglée
    Étant donné qu'aucune date de référence n'est épinglée pour le départemental mixte
    Quand on calcule la valeur d'une équipe de ce championnat
    Alors aucune valeur n'est produite
    Et l'écran indique qu'aucune valeur n'est calculable tant que la date n'est pas choisie

  Scénario: Épingler une date sur un championnat qui n'en prend pas
    Étant donné le championnat régional, qui arrête ses classements par journée
    Quand le coach tente d'y épingler une date de référence
    Alors l'opération est refusée
    Et le message rappelle que ce championnat les arrête journée par journée
```
