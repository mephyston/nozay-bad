# RF-SCH-001 : Ouverture d'une séance de jeu libre

## 1. Description et Objectif Métier

Le club met à disposition des créneaux de jeu libre le week-end, les jours fériés et pendant les vacances scolaires. Ils se géraient dans un tableur partagé : une colonne par jour d'ouverture, que les adhérents remplissaient à la main.

Cette règle décrit **ce qu'est une séance**, comment elle naît, et pourquoi elle se distingue du créneau hebdomadaire dont elle peut découler.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Séance de jeu libre (`open_play_sessions`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

Une **séance** est une occurrence **datée** : une date, un horaire, un gymnase. Le **créneau** (`schedule_slots`) ne dit qu'une habitude hebdomadaire et ne porte aucune date ; c'est précisément pourquoi il ne suffisait pas — le besoin porte d'abord sur les week-ends et les vacances, qui ne sont justement pas récurrents.

**Clé naturelle.** Une séance est identifiée par le triplet **(date, gymnase, heure de début)**. Deux séances ne peuvent pas partager ce triplet ; en revanche, deux gymnases peuvent accueillir une séance au même moment.

**Créer une séance déjà présente est refusé**, plutôt que de renvoyer silencieusement celle qui existe : le bureau croirait avoir créé la sienne, avec les horaires qu'il vient de saisir, alors qu'il regarderait ceux d'une autre.

**Le seuil d'ouverture est porté par la séance**, avec quatre joueurs par défaut. Il n'est pas un réglage global, pour deux raisons : un dimanche matin de vacances ne demande pas le même monde qu'un samedi après-midi, et la colonne **fige la valeur au moment où la décision a été prise** — changer le défaut l'an prochain ne réécrit pas l'histoire des séances déjà tenues.

**Trois états, dont un seul ne se déduise pas.**

| État | Ce qu'il emporte |
|---|---|
| `open` | Les adhérents s'inscrivent et se désinscrivent |
| `confirmed` | Un ouvreur s'est engagé. Les inscriptions **restent ouvertes** — c'est même le but |
| `cancelled` | Plus personne ne s'ajoute. La séance **reste visible**, barrée, avec son motif |

`confirmed` équivaut exactement à « un ouvreur est renseigné » : c'est une dénormalisation assumée, gardée parce qu'elle rend `cancelled` représentable et que l'écran du bureau filtre sur une colonne plutôt que sur trois. **« Seuil atteint » n'est pas un état** : c'est un calcul refait à chaque lecture, sans quoi il faudrait écrire à chaque désinscription — celle qu'on oublie.

**L'annulation exige un motif.** Contrairement à un événement annulé, que le site masque, la séance reste affichée à l'adhérent : celui qui s'était inscrit n'apprendrait rien d'une ligne disparue, il doit lire pourquoi il ne joue pas. Rouvrir efface le motif.

### Génération en lot

Les séances peuvent être **déroulées** depuis les créneaux hebdomadaires de la saison dont le public est « jeu libre ». Chaque occurrence garde le lien vers le créneau dont elle découle, ses horaires et son gymnase.

Ne sont déroulés que les créneaux **actifs** : masquer un créneau est justement la façon dont le bureau retire un horaire qu'il ne tient plus.

**L'opération est rejouable.** La clé naturelle rend chaque insertion sans effet si la séance existe déjà — le bureau peut donc étendre la période au fil de la saison sans se souvenir de ce qu'il a généré. Et surtout : une séance déjà pourvue n'est **jamais** défaite. Remettre son statut à « ouverte » et effacer son ouvreur ferait venir des gens devant une porte close.

Le résultat annonce ce qui a été créé **et** ce qui existait déjà. Sans ce second chiffre, une génération rejouée passerait pour une panne.

**La période est bornée à un an.** Sans borne, une faute de frappe sur l'année produirait des milliers d'insertions.

**Une saison sans créneau de jeu libre est un refus**, pas un silence : générer zéro séance sans rien dire laisserait croire que l'opération a fonctionné.

**Une séance passée** sort des listes par simple filtrage au rendu. Il n'existe pas de statut « passée » : un statut qui se déduit de l'horloge est un statut qui périme et qu'il faudrait maintenir.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Ouverture d'une séance de jeu libre

  Scénario: Le bureau ouvre une séance de vacances
    Étant donné le gymnase « Pierre Dupuis » enregistré
    Quand le bureau ouvre une séance le samedi 21 mars de 14 h à 17 h
    Alors la séance est ouverte aux inscriptions
    Et son seuil d'ouverture est de 4 joueurs
    Et elle n'a pas d'ouvreur

  Scénario: Deux séances identiques sont refusées
    Étant donné une séance le 21 mars à 14 h à « Pierre Dupuis »
    Quand le bureau en ouvre une seconde à la même date, au même endroit, à la même heure
    Alors l'opération est refusée
    Et le refus indique qu'une séance existe déjà

  Scénario: Deux gymnases au même moment
    Étant donné une séance le 21 mars à 14 h à « Pierre Dupuis »
    Quand le bureau ouvre une séance le 21 mars à 14 h à « La Source »
    Alors les deux séances coexistent

  Scénario: Un seuil propre à la séance
    Quand le bureau ouvre une séance en demandant 6 joueurs
    Alors cette séance exige 6 joueurs
    Et les autres séances conservent le seuil qui était le leur

  Scénario: Une séance qui finit avant de commencer
    Quand le bureau saisit une séance de 17 h à 14 h
    Alors l'opération est refusée
    Et le refus indique que l'heure de fin doit suivre l'heure de début

  Scénario: Une date qui n'existe pas
    Quand le bureau saisit une séance au 31 février
    Alors l'opération est refusée

  Scénario: Annuler exige un motif
    Étant donné une séance ouverte aux inscriptions
    Quand le bureau l'annule sans indiquer de motif
    Alors l'opération est refusée
    Et le refus rappelle que l'adhérent inscrit doit pouvoir lire ce motif

  Scénario: Une séance annulée reste lisible
    Étant donné une séance à laquelle un adhérent s'est inscrit
    Quand le bureau l'annule avec le motif « Gymnase fermé »
    Alors la séance reste affichée à l'adhérent, barrée, avec son motif
    Et les inscriptions déjà prises sont conservées

  Scénario: Dérouler un créneau récurrent sur une période
    Étant donné un créneau de jeu libre le samedi de 14 h à 17 h
    Quand le bureau génère la période du 16 au 29 mars
    Alors deux séances sont créées, les samedis 21 et 28 mars
    Et chacune garde le lien vers le créneau dont elle découle

  Scénario: Rejouer une génération ne crée rien
    Étant donné une période déjà générée
    Quand le bureau la génère de nouveau
    Alors aucune séance n'est créée
    Et le bureau lit combien existaient déjà

  Scénario: Rejouer ne défait pas une séance pourvue
    Étant donné une séance générée, qu'un bénévole s'est engagé à ouvrir
    Quand le bureau génère de nouveau une période qui l'englobe
    Alors la séance reste confirmée
    Et elle garde le nom de son ouvreur

  Scénario: Un créneau masqué n'est pas déroulé
    Étant donné un créneau de jeu libre masqué du site
    Quand le bureau génère une période
    Alors l'opération est refusée
    Et le refus indique qu'aucun créneau de jeu libre n'est actif

  Scénario: Une période trop large est refusée
    Étant donné un créneau de jeu libre actif
    Quand le bureau génère une période de dix ans
    Alors l'opération est refusée
    Et le refus indique que la période ne peut pas dépasser un an

  Scénario: Rouvrir efface le motif
    Étant donné une séance annulée pour « Gymnase fermé »
    Quand le bureau la rouvre
    Alors les inscriptions redeviennent possibles
    Et la séance n'affiche plus de motif d'annulation
```
