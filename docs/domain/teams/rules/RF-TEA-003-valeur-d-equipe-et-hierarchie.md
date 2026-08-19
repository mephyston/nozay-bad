# RF-TEA-003 : Valeur d'équipe et hiérarchie du club

## 1. Description et Objectif Métier

C'est la règle qui justifie la fonctionnalité entière.

Un club qui engage plusieurs équipes dans un même championnat doit les présenter dans l'ordre de leur force : *l'équipe n doit avoir une valeur estimée inférieure ou égale à celle de l'équipe n−1*. En cas d'infraction, **les deux équipes** perdent leur rencontre par pénalité — celle qui est trop forte comme celle qu'elle dépasse.

Le contrôle suppose de comparer les compositions de toutes les équipes d'un championnat pour une même journée. Aucun capitaine ne peut le faire seul : il ne voit que la sienne.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `club_teams` (`number`), `lineup_slots`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Barèmes

Deux barèmes, sans rapport l'un avec l'autre :

- **CD91** (départementaux, art. 6.3.3) — linéaire : `NC` 0, `P12` 1, `P11` 2, `P10` 3, `D9` 4, `D8` 5, `D7` 6, `R6` 7, `R5` 8, `R4` 9, `N3` 10, `N2` 11, `N1` 12.
- **FFBaD** (régional, art. 5.4.1) — non linéaire : `P12` 1 … `D7` 12, `R6` 18, `R5` 24, `R4` 30, `N3` 39, `N2` 48, et **cinq paliers `N1`** (57, 66, 75, 84, 93) départagés par la cote. Les seuils diffèrent selon la discipline : le double mixte relève de la colonne des hommes. Cote inconnue : palier plancher (57), choix prudent qui sous-estime l'équipe et ne peut donc pas la faire passer pour conforme à tort.

### Formules

**Départemental** — chaque ligne de la rencontre est évaluée : un simple vaut les points de son joueur, un double la **moyenne** de sa paire. On additionne, puis on divise par le **nombre de lignes composées** — et non par le format. Le règlement est explicite : « si une équipe est incomplète, la division ne se fait plus par 7 ou 8, mais par le nombre de matchs joués ». Diviser par 7 une équipe à 6 lignes la sous-évaluerait, c'est-à-dire la ferait passer pour conforme à tort.

**Régional** — on ignore les lignes et on lit la feuille de composition : les **3 meilleurs joueurs et les 3 meilleures joueuses**, chacun au meilleur de ses trois classements, additionnés puis divisés par 6. Un joueur aligné deux fois ne compte qu'une. Les places non pourvues valent zéro, et le diviseur reste 6 — ici, l'incomplétude fait bien baisser la valeur.

**Vétérans** — aucune valeur d'équipe. Le règlement n'évalue que les doubles, pour l'ordre des paires. Aucune contrainte de hiérarchie n'en découle, et l'écran n'en affiche aucune.

### Hiérarchie

La comparaison se fait entre équipes **du même club et du même championnat**, ordonnées par leur numéro (1 = équipe 1). Deux exceptions :

- **Masculin** — la valeur ne se compare pas entre la D4 « Promotion » et les autres divisions, mais elle se compare entre équipes de D4.
- **Régional** — la contrainte s'apprécie **par semaine**, et s'étend aux équipes nationales du club le cas échéant.

### Nature du contrôle

L'infraction est présentée en **avertissement**, jamais en blocage. La valeur d'une équipe dépend de compositions d'autres équipes qui sont encore en cours de saisie : bloquer le premier capitaine qui enregistre parce que le troisième n'a rien saisi rendrait l'outil inutilisable. La valeur est affichée en direct au capitaine, avec le plafond à respecter, et remonte en anomalie sur l'écran de contrôle du coach.

Une valeur **non calculable** — classement manquant, date de référence non épinglée — n'est jamais remplacée par une estimation. Elle est affichée comme telle.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Valeur d'équipe et hiérarchie

  Scénario: L'exemple de l'annexe 1 du règlement mixte
    Étant donné une rencontre à 7 matchs composée ainsi :
      | ligne | classements |
      | SH1   | N3          |
      | SH2   | R4          |
      | SH3   | D7          |
      | SD    | R6          |
      | DH    | N2 / D7     |
      | DD    | R6 / R6     |
      | MX    | D8 / R5     |
    Quand on calcule la valeur de l'équipe
    Alors le total vaut 54
    Et la valeur vaut 54 / 7, soit 7,71

  Scénario: Une équipe incomplète se divise par le nombre de matchs joués
    Étant donné une équipe départementale composée de 6 lignes sur 7
    Quand on calcule sa valeur
    Alors le diviseur est 6, et non 7

  Scénario: Infraction à la hiérarchie
    Étant donné que NBA91-2 vaut 5,20 sur la journée 3 du départemental mixte
    Et que NBA91-3 vaut 5,60 sur la même journée
    Quand le coach consulte le contrôle de cette journée
    Alors une anomalie signale que NBA91-3 dépasse NBA91-2
    Et le capitaine de NBA91-3 voit qu'il doit rester au plus à 5,20
    Mais sa composition reste enregistrable

  Scénario: Le classement manquant n'est pas deviné
    Étant donné une composition où un joueur n'a pas de classement en simple
    Quand on calcule la valeur de l'équipe
    Alors aucune valeur n'est produite
    Et le joueur concerné est signalé

  Scénario: Les vétérans n'ont pas de hiérarchie de valeur
    Étant donné deux équipes du championnat départemental vétérans
    Quand on calcule leurs valeurs sur une même journée
    Alors aucune valeur d'équipe n'est produite
    Et aucune anomalie de hiérarchie n'est signalée
```
