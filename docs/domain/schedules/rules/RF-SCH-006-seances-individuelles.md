# RF-SCH-006 : Soirées d'indiv

## 1. Description et Objectif Métier

Au début de l'entraînement compétiteurs du mardi et du jeudi, l'entraîneur prend deux fois trente minutes pour travailler avec une ou deux personnes. Rien ne tenait ces soirées : les demandes arrivaient sur WhatsApp, et le choix se faisait de mémoire.

Cette règle décrit **ce qu'est une soirée d'indiv**, comment elle naît, et ce qui la ferme.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Soirée d'indiv (`indiv_sessions`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Une soirée d'indiv est une date, une heure de début et des créneaux dérivés.** Le k-ième créneau va de `start_time + (k-1) × slot_minutes` à `start_time + k × slot_minutes`. Les créneaux ne sont jamais stockés : ils se calculent, et une seule fonction connaît cette arithmétique. Le club en tient deux de trente minutes, avec deux places chacun — mais ces trois réglages sont **portés par la soirée**, pour que changer l'habitude l'an prochain ne réécrive pas celles déjà tenues.

**La soirée tient dans la journée.** Une heure de début valide dont la fin dépasserait minuit est refusée.

**Une soirée naît à la main ou par génération.** La génération déroule les créneaux **marqués « séances individuelles »** (`indiv`) et **actifs** de la grille sur une période bornée à un an — le public ne suffit pas : sur quatre créneaux compétiteurs, deux seulement en portent ; l'heure de début est celle du créneau, sauf indication. Elle est **idempotente** : la clé naturelle (date, gymnase, heure) fait que rejouer une période n'insère rien de nouveau et **ne touche pas** aux soirées existantes — en particulier, elle ne rouvre jamais une soirée annoncée. Générer zéro soirée faute de créneau est un refus, pas un silence.

**Trois états.** `open` : les candidatures sont ouvertes. `announced` : l'entraîneur a rendu sa décision publique — les candidatures se ferment, et les retenus comptent dans l'équité de la saison. `cancelled` : retirée, **avec son motif**, obligatoire, que le candidat doit pouvoir lire. Rouvrir efface le motif et rend la parole aux candidats ; les retenus restent marqués, à l'entraîneur de ré-annoncer.

**Resserrer une soirée sous ses retenus est refusé.** Réduire le nombre de créneaux ou de places n'est possible que si aucune sélection existante n'y perd sa place : l'entraîneur retire d'abord, puis resserre.

**Aucune saison n'est stockée.** La saison se lit dans la date, avec la bascule au 1er août — même règle que le jeu libre.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Soirées d'indiv

  Scénario: Une soirée naît à l'habitude du club
    Quand l'entraîneur crée une soirée sans autre réglage que la date et l'heure
    Alors elle compte deux créneaux de trente minutes, deux places chacun
    Et elle est ouverte aux candidatures

  Scénario: La génération déroule les créneaux d'indiv
    Étant donné un créneau marqué « séances individuelles » actif le mardi à 19 h 30 et un autre le jeudi
    Quand l'entraîneur génère les soirées du 16 au 29 mars
    Alors quatre soirées existent, deux mardis et deux jeudis, à 19 h 30

  Scénario: Un créneau compétiteurs sans le marqueur ne produit rien
    Étant donné un créneau compétiteurs actif le mardi à 20 h 30, non marqué
    Quand l'entraîneur génère les soirées du 16 au 29 mars
    Alors l'opération est refusée faute de créneau

  Scénario: Rejouer une période ne défait rien
    Étant donné une soirée générée puis annoncée
    Quand l'entraîneur regénère une période qui la contient
    Alors la soirée reste annoncée et aucune n'est créée en double

  Scénario: Une soirée qui franchit minuit est refusée
    Quand l'entraîneur crée une soirée à 23 h 30 de deux créneaux de trente minutes
    Alors l'opération est refusée

  Scénario: Annuler exige un motif
    Quand l'entraîneur annule une soirée sans motif
    Alors l'opération est refusée

  Scénario: Resserrer sous les retenus est refusé
    Étant donné une soirée dont le second créneau compte deux retenus
    Quand l'entraîneur réduit la soirée à un seul créneau
    Alors l'opération est refusée
```
