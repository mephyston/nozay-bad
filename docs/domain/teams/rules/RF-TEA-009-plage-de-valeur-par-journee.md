# RF-TEA-009 : Plage de valeur de chaque équipe, par journée

## 1. Description et Objectif Métier

La valeur d'une équipe ne doit pas dépasser celle de l'équipe du dessus (art. 6.3.2, RF-TEA-003). Le contrôle des journées ne la montrait qu'une fois la compo saisie. Le coach a besoin de savoir **avant** jusqu'où chaque équipe peut monter ou descendre avec son effectif, et si deux équipes voisines risquent de se croiser.

Pour chaque journée, le contrôle affiche donc une **plage** par équipe : la valeur de la compo la plus faible et celle de la compo la plus forte que l'effectif permet. Il y ajoute un **verdict** face à l'équipe du dessus.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `team_roster`, classements de référence de la journée, `list-day-values`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Ce qui est calculé

- **Sur l'effectif complet de l'équipe**, joueurs déjà alignés ailleurs la même semaine compris : c'est le potentiel de l'équipe, que la valeur saisie vient situer.
- Avec le **classement de référence de la journée** : celui de la saison en départemental, celui de la semaine en régional.
- Avec les règles du championnat qui pèsent sur la valeur :
  - le genre de chaque ligne ;
  - l'éligibilité tableau par tableau ;
  - la catégorie d'âge ;
  - une seule ligne par discipline et par joueur (art. 6.2.1) ;
  - `maxMatchesPerPlayer` matchs au plus par joueur.
- Ne sont pas pris en compte : le plafond de mutés, la titularisation et les renforts. Ce sont des avertissements de composition, pas des contraintes de valeur.

### Les deux formules

- **Départemental (par ligne)** : chaque place vaut le barème CD91 du joueur dans la discipline. Un double compte la moyenne de sa paire. La valeur est la somme des lignes divisée par le nombre de matchs.
  - Minimum et maximum sont **exacts**. Le calcul est une affectation des joueurs aux places, résolue par un flot de coût minimal (`shared/seat-assignment.ts`).
  - Les tests le vérifient contre une énumération exhaustive.
- **Régional (3 meilleurs + 3 meilleures ÷ 6)** : la valeur ne regarde que les trois meilleurs de chaque genre sur la feuille, au meilleur de leurs classements. Minimum et maximum sont aussi **exacts**, calculés genre par genre en parcourant les trios de joueurs :
  - **Plafond** : du trio le plus fort au plus faible, le premier qu'une feuille complète peut porter.
  - **Plancher** : du trio le plus faible au plus fort, le premier qui complète la feuille avec des joueurs qui ne le dépassent pas.
  - Les tests le vérifient eux aussi contre l'énumération de toutes les feuilles possibles.
- **Vétérans** : pas de valeur d'équipe, donc pas de plage.
- Un effectif qui ne peut pas remplir toutes les lignes n'a pas de plage : l'écran affiche « Effectif insuffisant ».

### Le verdict face à l'équipe du dessus

L'équipe du dessus est celle que le contrôle `W1` désigne. La promotion masculine, hors hiérarchie, n'en a pas.

| Verdict | Condition | Lecture |
|---|---|---|
| Aucun risque | max ≤ min du dessus | aucune compo ne peut dépasser |
| Selon les compos | les plages se chevauchent | le dépassement dépend des compos du jour |
| Dépassement inévitable | min > max du dessus | même la plus faible dépasse : les effectifs sont à revoir |

### Affichage

- Une barre par équipe sur un **axe commun**, et un point pour la valeur de la compo saisie.
- Le verdict est un badge avec icône et libellé, jamais une couleur seule.
- Les chiffres sont écrits à côté de chaque barre et repris au survol.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Plage de valeur au contrôle des journées

  Scénario: La plage se calcule sur l'effectif, sans attendre la composition
    Étant donné une équipe départementale dont tout l'effectif est classé D7
    Et aucune composition saisie pour la journée
    Quand le coach ouvre le contrôle de la journée
    Alors la plage de l'équipe va de 6,00 à 6,00

  Scénario: La plage respecte le nombre de matchs et les tableaux admis
    Étant donné une équipe masculine de six joueurs, de D7 à P12
    Quand on calcule sa plage
    Alors la compo la plus forte aligne les quatre meilleurs en simple et en double
    Et un joueur qui n'est pas admis en double n'y est jamais placé

  Scénario: Aucun risque
    Étant donné l'équipe 1 entièrement en D7 et l'équipe 2 entièrement en D9
    Quand le coach ouvre le contrôle de la journée
    Alors l'équipe 2 porte le verdict « Aucun risque »

  Scénario: Dépassement inévitable
    Étant donné l'équipe 1 entièrement en D9 et l'équipe 2 entièrement en D7
    Quand le coach ouvre le contrôle de la journée
    Alors l'équipe 2 porte le verdict « Dépassement inévitable »

  Scénario: Effectif insuffisant
    Étant donné une équipe dont l'effectif ne peut pas remplir toutes les lignes
    Quand le coach ouvre le contrôle de la journée
    Alors l'équipe n'a pas de plage et l'écran affiche « Effectif insuffisant »

  Scénario: Les vétérans n'ont pas de plage
    Étant donné une équipe de l'ICD vétérans
    Quand le coach ouvre le contrôle de la journée
    Alors aucune plage de valeur n'est affichée
```
